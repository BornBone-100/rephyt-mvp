import { ClinicalSafeGuard } from "./ClinicalSafeGuard";

export type MasterAnalysisAuthor = {
  full_name?: string | null;
  years_of_experience?: number | null;
};

export type MasterAnalysisEvaluationData = {
  rom_value?: number | string | null;
  gap?: number | string | null;
};

export type MasterAnalysisPost = {
  author: MasterAnalysisAuthor;
  evaluation_area?: string | null;
  evaluation_data?: MasterAnalysisEvaluationData | null;
  care_guide?: string | null;
};

type MasterAnalysisCardProps = {
  post: MasterAnalysisPost;
  userPlan?: string | null;
};

export function MasterAnalysisCard({ post, userPlan: _userPlan }: MasterAnalysisCardProps) {
  const years = post.author?.years_of_experience ?? 0;
  const isMaster = typeof years === "number" && years >= 10;
  const rom = post.evaluation_data?.rom_value ?? "—";
  const gap = post.evaluation_data?.gap ?? "—";
  const area = post.evaluation_area || "Clinical";

  return (
    <div className="rounded-[32px] border border-zinc-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex gap-3">
          <div className="h-10 w-10 rounded-full border border-zinc-200 bg-zinc-100" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">{post.author?.full_name || "—"}</span>
              {isMaster ? (
                <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-black text-amber-600">
                  10Y+ MASTER
                </span>
              ) : null}
            </div>
            <p className="text-[10px] text-zinc-400">{years}년차 임상 전문가</p>
          </div>
        </div>
        <button type="button" className="text-zinc-300" aria-label="더보기">
          ⋮
        </button>
      </div>

      <div className="space-y-4">
        <div className="inline-block rounded-full bg-indigo-50 px-3 py-1">
          <span className="text-[10px] font-bold uppercase text-indigo-600">
            #{area} Evaluation
          </span>
        </div>

        <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-5">
          <h4 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-zinc-400">Analysis Data</h4>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-black text-[#001A3D]">{rom}°</p>
              <p className="text-xs text-slate-500">객관적 가동 범위 측정값</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-indigo-600">정상 대비 {gap}%</p>
              <p className="text-[10px] text-zinc-400">기능 모니터링 필요</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-800">Care Guide</h4>
          <p className="text-sm leading-relaxed text-slate-600">{post.care_guide || "—"}</p>
        </div>
      </div>

      <ClinicalSafeGuard />
    </div>
  );
}
