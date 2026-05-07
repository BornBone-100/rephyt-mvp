"use client";

import { Lock } from "lucide-react";

type LockedFeatureCardProps = {
  title?: string;
  subtitle?: string;
  message?: string;
};

export default function LockedFeatureCard({
  title = "Re:PhyT AI - 사전 스크리닝",
  subtitle = "Global Body-Part Engine (v1.0)",
  message = "현재 Re:PhyT AI 엔진 고도화 작업 중입니다.\n더 정교한 분석을 위해 곧 찾아뵙겠습니다!",
}: LockedFeatureCardProps) {
  const handleLockedClick = () => {
    alert(message);
  };

  return (
    <div onClick={handleLockedClick} className="group relative cursor-pointer">
      <div className="rounded-[2.5rem] border border-slate-100 bg-white p-6 opacity-50 grayscale shadow-sm transition-all">
        <h3 className="mb-2 text-xl font-black text-slate-900">{title}</h3>
        <p className="text-sm font-medium text-slate-500">{subtitle}</p>
        <div className="mt-4 h-32 rounded-2xl border border-dashed border-slate-200 bg-slate-50" />
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[2.5rem] bg-slate-900/10 backdrop-blur-[2px] transition-all group-hover:bg-slate-900/20">
        <div className="mb-3 rounded-full bg-white p-4 shadow-xl">
          <Lock className="h-6 w-6 text-indigo-600" />
        </div>
        <span className="rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
          Coming Soon
        </span>
      </div>
    </div>
  );
}
