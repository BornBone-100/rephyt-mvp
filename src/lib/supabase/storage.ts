import { createSupabaseBrowserClient } from "./client";

export const uploadMedia = async (file: File, folder: string = "posts") => {
  try {
    const supabase = createSupabaseBrowserClient();

    // 1. 파일 이름 중복 방지를 위한 고유 경로 생성 (날짜 + 랜덤값)
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    // 2. Supabase Storage로 업로드
    const { error } = await supabase.storage.from("community_media").upload(filePath, file);
    if (error) throw error;

    // 3. 업로드된 파일의 공용 URL 가져오기
    const {
      data: { publicUrl },
    } = supabase.storage.from("community_media").getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error("Error uploading media:", error);
    return null;
  }
};
