import { Award, ShieldCheck, TrendingUp, MessageCircle } from "lucide-react";

type CommunityFeedCardData = {
  overallScore: number;
  challengeTitle: string;
  anonymousCaseSummary: string;
  defenseHighlight: string;
  commentCount: number;
};

type Props = {
  data: CommunityFeedCardData;
};

export default function CommunityFeedCard({ data }: Props) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between border-b border-slate-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-600">PT</div>
          <div>
            <p className="text-sm font-bold text-slate-800">Senior Physical Therapist</p>
            <p className="text-xs text-slate-400">Just now · Busan</p>
          </div>
        </div>
        <div className="rounded-full bg-blue-600 px-3 py-1 text-xs font-black italic text-white">SCORE: {data.overallScore}</div>
      </div>

      <div className="relative aspect-square bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white">
        <div className="absolute right-4 top-4 opacity-20">
          <TrendingUp size={120} />
        </div>

        <div className="relative z-10">
          <span className="rounded bg-blue-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-300">Case Study</span>
          <h2 className="mt-2 text-2xl font-black leading-tight">{data.challengeTitle}</h2>
          <p className="mt-2 text-sm text-slate-400">{data.anonymousCaseSummary}</p>
        </div>

        <div className="relative z-10 mt-8 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
            <ShieldCheck size={18} /> {data.defenseHighlight}
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-blue-400">
            <Award size={18} /> 98% aligned with JOSPT guideline standards
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 p-4">
        <button className="flex items-center gap-1.5 text-slate-600 transition-colors hover:text-blue-600">
          <MessageCircle size={20} />
          <span className="text-xs font-bold text-slate-500">Join Discussion {data.commentCount}</span>
        </button>
        <button className="ml-auto rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600">Analyze this case</button>
      </div>
    </div>
  );
}
