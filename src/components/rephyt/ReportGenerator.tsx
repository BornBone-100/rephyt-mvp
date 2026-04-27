"use client";

import { checkSaveLimit, type SubscriptionUser } from "@/lib/guardrails";

type ReportGeneratorProps = {
  profile: SubscriptionUser & { id?: string | null };
  onGenerate: () => Promise<void> | void;
  /** 외부 결제 플로우(모달/리다이렉트) 연결용 */
  onRequirePayment?: () => Promise<void> | void;
};

export function ReportGenerator({ profile, onGenerate, onRequirePayment }: ReportGeneratorProps) {
  const handleGenerateReport = async () => {
    const gate = checkSaveLimit(profile);
    if (!gate.allowed) {
      alert("무료 사용량(5회)을 초과했습니다. Pro 플랜으로 결제하시겠습니까?");
      await onRequirePayment?.();
      return;
    }

    await onGenerate();
  };

  return (
    <button
      type="button"
      onClick={() => void handleGenerateReport()}
      className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
    >
      리포트 생성
    </button>
  );
}

