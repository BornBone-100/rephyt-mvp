import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/utils/supabase/client";

const SIGNATURE_BUCKET = "patient_signatures";

export type SaveConsentInput = {
  signatureDataUrl: string;
  patientId?: string | null;
};

export type SaveConsentResult = {
  consentId: string;
  signatureImageUrl: string;
  agreedAt: string;
};

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(",");
  if (!meta || !base64) {
    throw new Error("서명 데이터 형식이 올바르지 않습니다.");
  }
  const mimeMatch = /data:(.*?);base64/.exec(meta);
  const mime = mimeMatch?.[1] || "image/png";
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

export async function savePatientConsent(input: SaveConsentInput): Promise<SaveConsentResult> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("로그인 세션이 필요합니다.");
  }

  const blob = dataUrlToBlob(input.signatureDataUrl);
  const filename = `${uuidv4()}-${Date.now()}.png`;
  const storagePath = `${user.id}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from(SIGNATURE_BUCKET)
    .upload(storagePath, blob, {
      upsert: false,
      contentType: "image/png",
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  // private bucket이므로 signature_image_url에는 경로(path)를 저장
  const agreedAt = new Date().toISOString();

  const { data, error: insertError } = await supabase
    .from("patient_consents" as never)
    .insert({
      patient_id: input.patientId ?? null,
      therapist_id: user.id,
      signature_image_url: storagePath,
      agreed_at: agreedAt,
    })
    .select("id, signature_image_url, agreed_at" as never)
    .single();

  if (insertError || !data) {
    throw new Error(insertError?.message || "동의서 저장에 실패했습니다.");
  }

  return {
    consentId: data.id,
    signatureImageUrl: data.signature_image_url,
    agreedAt: data.agreed_at,
  };
}

