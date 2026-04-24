"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const reportReasons = [
  "환자 개인정보(이름, 얼굴 등) 노출",
  "부적절한 광고 및 스팸",
  "허위 사실 및 비과학적 정보",
  "욕설 및 비방",
] as const;

type ReportModalProps = {
  postId: string;
  onClose: () => void;
};

export function ReportModal({ postId, onClose }: ReportModalProps) {
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason || submitting) return;

    setSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await (supabase as any).from("post_reports").insert({
        post_id: postId,
        reason,
        details,
      });

      if (!error) {
        alert("신고가 접수되었습니다. 관리자가 신속히 검토하겠습니다.");
        onClose();
      } else {
        alert("신고 접수에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-t-[32px] bg-white p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-zinc-200" />

        <h3 className="mb-2 text-xl font-bold text-slate-900">게시글 신고하기</h3>
        <p className="mb-6 text-xs text-slate-400">Re:PhyT의 전문성과 신뢰도를 지키기 위한 조치입니다.</p>

        <div className="space-y-3">
          {reportReasons.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`w-full rounded-2xl border p-4 text-left text-sm transition-all ${
                reason === r ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-zinc-100 text-slate-600"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <textarea
          placeholder="상세 내용을 적어주세요 (선택사항)"
          className="mt-4 h-24 w-full rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-sm focus:ring-indigo-600"
          onChange={(e) => setDetails(e.target.value)}
          value={details}
        />

        <button
          onClick={handleSubmit}
          disabled={!reason || submitting}
          className="mt-6 w-full rounded-2xl bg-[#001A3D] py-4 font-bold text-white shadow-lg transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "제출 중..." : "신고 제출"}
        </button>
      </div>
    </div>
  );
}
