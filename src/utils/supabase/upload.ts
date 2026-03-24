import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/utils/supabase/client";

const BUCKET = "clinical_media";

export type UploadedClinicalMedia = {
  path: string;
  url: string;
};

function getSafeFileName(originalName: string): string {
  const sanitized = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return sanitized || "media.bin";
}

export async function uploadClinicalMedia(file: File): Promise<UploadedClinicalMedia> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("로그인 세션이 필요합니다.");
  }

  const fileName = `${uuidv4()}-${Date.now()}-${getSafeFileName(file.name)}`;
  const path = `${user.id}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  // private bucket 환경에서 접근 가능한 URL(서명 URL) 발급
  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days

  if (signError || !signed?.signedUrl) {
    throw new Error(signError?.message || "업로드 후 URL 생성에 실패했습니다.");
  }

  return {
    path,
    url: signed.signedUrl,
  };
}

