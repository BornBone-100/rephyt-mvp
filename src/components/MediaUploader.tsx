"use client";

import { useMemo, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { uploadClinicalMedia } from "@/utils/supabase/upload";
import { PhotoUploadGuideline } from "@/components/upload/PhotoUploadGuideline";

type MediaUploaderProps = {
  onUploaded?: (url: string) => void;
};

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "video/mp4"];

export default function MediaUploader({ onUploaded }: MediaUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [privacyConsent, setPrivacyConsent] = useState(false);

  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  const pickFile = (picked: File | null) => {
    setMessage(null);
    setError(null);
    if (!picked) return;
    if (!ACCEPTED_TYPES.includes(picked.type)) {
      setError("jpg, png, mp4 형식만 업로드할 수 있습니다.");
      return;
    }
    setFile(picked);
  };

  const handleUpload = async () => {
    if (!privacyConsent) {
      setError("임상 사진 업로드 주의사항에 동의해 주세요.");
      return;
    }
    if (!file) {
      setError("먼저 파일을 선택해 주세요.");
      return;
    }
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const uploaded = await uploadClinicalMedia(file);
      setMessage("업로드가 완료되었습니다.");
      onUploaded?.(uploaded.url);
      setFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <PhotoUploadGuideline consent={privacyConsent} onConsentChange={setPrivacyConsent} />
      <div className="text-sm font-semibold text-zinc-900">임상 미디어 보관함</div>
      <div className="mt-1 text-xs text-zinc-600">
        이미지(jpg, png) 또는 영상(mp4)을 업로드할 수 있습니다.
      </div>

      <label
        className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${
          dragOver
            ? "border-blue-400 bg-blue-50"
            : "border-zinc-300 bg-zinc-50 hover:bg-zinc-100"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          pickFile(e.dataTransfer.files?.[0] ?? null);
        }}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,video/mp4"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        <UploadCloud className="h-6 w-6 text-zinc-500" />
        <p className="mt-2 text-sm text-zinc-700">
          클릭 또는 드래그 앤 드롭으로 파일 선택
        </p>
      </label>

      {file && previewUrl ? (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="text-xs font-medium text-zinc-700">미리보기</div>
          <div className="mt-2 overflow-hidden rounded-lg border border-zinc-200 bg-white">
            {file.type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="미리보기" className="max-h-64 w-full object-contain" />
            ) : (
              <video src={previewUrl} controls className="max-h-64 w-full" />
            )}
          </div>
          <div className="mt-2 text-xs text-zinc-600">{file.name}</div>
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-900 px-4 text-sm font-medium text-white hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {uploading ? "업로드 중..." : "업로드"}
        </button>
      </div>

      {message ? (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

