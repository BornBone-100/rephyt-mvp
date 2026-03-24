"use client";

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Loader2 } from "lucide-react";
import { savePatientConsent } from "@/utils/supabase/consent";

type ConsentSignaturePadProps = {
  patientId?: string | null;
  onSaved?: (result: { consentId: string; signatureImageUrl: string; agreedAt: string }) => void;
  onCancel?: () => void;
};

export default function ConsentSignaturePad({
  patientId,
  onSaved,
  onCancel,
}: ConsentSignaturePadProps) {
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const clearSignature = () => {
    sigRef.current?.clear();
    setError(null);
    setMessage(null);
  };

  const submitConsent = async () => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      setError("서명을 입력해 주세요.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const signatureDataUrl = sigRef.current
        .getTrimmedCanvas()
        .toDataURL("image/png");

      const result = await savePatientConsent({
        signatureDataUrl,
        patientId,
      });

      setMessage("동의 및 서명이 안전하게 저장되었습니다.");
      onSaved?.(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "서명 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-zinc-900">전자 서명 및 동의서</div>
      <div className="mt-2 max-h-36 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs leading-5 text-zinc-700">
        개인정보 수집 및 활용 동의서 (음성 데이터 AI 분석 및 임상 미디어 자료 보관 등): 본인은 Re:PhyT의
        임상기록 서비스 이용을 위하여 환자 관련 민감정보(건강정보, 기능평가 기록, 음성 기반 임상 메모, 이미지 및
        영상 자료)가 치료 목적 범위 내에서 수집·이용·보관될 수 있음을 이해하고 동의합니다. 해당 정보는 진료기록
        작성, 경과 모니터링, AI 보조 임상 추론 품질 향상 목적에 한해 최소한으로 처리되며, 관련 법령(개인정보보호법
        및 의료정보 관련 규정)에 따라 보호됩니다. 본인은 언제든지 법령이 허용하는 범위에서 열람·정정·삭제 및 처리
        제한을 요청할 수 있습니다.
      </div>

      <div className="mt-3 rounded-xl border border-zinc-300 bg-white">
        <SignatureCanvas
          ref={(instance) => {
            sigRef.current = instance;
          }}
          penColor="#1f2937"
          canvasProps={{
            className: "h-56 w-full rounded-xl",
          }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={clearSignature}
          disabled={saving}
          className="h-10 rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          지우기(다시 쓰기)
        </button>
        <button
          type="button"
          onClick={submitConsent}
          disabled={saving}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-900 px-4 text-sm font-medium text-white hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? "저장 중..." : "동의 및 서명 완료"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="h-10 rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            닫기
          </button>
        ) : null}
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

