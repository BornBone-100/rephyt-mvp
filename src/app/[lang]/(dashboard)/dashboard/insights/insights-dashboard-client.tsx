"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Activity, BarChart3, ShieldCheck, Target, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type SummaryStats = {
  totalScreenings: number;
  avgSafetyIndex: number;
  avgDefenseScore: number;
  recoveryPredictionAccuracy: number;
  totalCommunityPosts: number;
};

type RiskSlice = {
  label: string;
  value: number;
};

type TrendPoint = {
  period: string;
  quality: number;
};

type Props = {
  lang: string;
  summary: SummaryStats;
  riskDistribution: RiskSlice[];
  qualityTrend: TrendPoint[];
};

const PIE_COLORS = ["#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe", "#334155"];

function SummaryCard({
  title,
  value,
  hint,
  icon,
}: {
  title: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
        <span className="text-indigo-600">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-black text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </article>
  );
}

export default function InsightsDashboardClient({ lang, summary, riskDistribution, qualityTrend }: Props) {
  const router = useRouter();
  const isEnglish = lang === "en";
  const isDataSparse = summary.totalScreenings < 3;
  const riskData = useMemo(() => riskDistribution.slice(0, 8), [riskDistribution]);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">
          {isEnglish ? "Clinical Insights Dashboard" : "Clinical Insights 대시보드"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {isEnglish
            ? "Visualize honest data and practical safety indicators from your daily screenings."
            : "정직한 데이터와 실무 안전 지표를 한눈에 확인하는 임상 인사이트 허브입니다."}
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title={isEnglish ? "Total Screenings" : "총 스크리닝 횟수"}
          value={summary.totalScreenings.toLocaleString()}
          hint={isEnglish ? "CDSS logs analyzed" : "치료사 기준 누적 로그"}
          icon={<Activity className="h-4 w-4" />}
        />
        <SummaryCard
          title={isEnglish ? "Avg Safety Index" : "평균 안전 지수"}
          value={`${summary.avgSafetyIndex}%`}
          hint={isEnglish ? "Overall risk-filter score" : "종합 안전 필터 평균"}
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <SummaryCard
          title={isEnglish ? "Avg Defense Score" : "평균 삭감 방어 점수"}
          value={`${summary.avgDefenseScore}%`}
          hint={isEnglish ? "Documentation defense quality" : "차팅 방어력 지표"}
          icon={<Target className="h-4 w-4" />}
        />
        <SummaryCard
          title={isEnglish ? "Prediction Accuracy" : "회복 예측 정확도"}
          value={`${summary.recoveryPredictionAccuracy}%`}
          hint={
            isEnglish
              ? `Based on ${summary.totalCommunityPosts} related community posts`
              : `커뮤니티 게시글 ${summary.totalCommunityPosts}건 반영`
          }
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </section>

      {isDataSparse ? (
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-700">
            {isEnglish
              ? "Data is being analyzed. Please create more reports to unlock full insights."
              : "데이터를 분석 중입니다. 더 많은 리포트를 작성해 주세요."}
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="h-56 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
            <div className="h-56 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
          </div>
        </section>
      ) : (
        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-black text-slate-900">
                {isEnglish ? "Risk Distribution by Pattern" : "위험군 분포 차트"}
              </h2>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskData}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={64}
                    outerRadius={94}
                    paddingAngle={2}
                    onClick={(entry: any) => {
                      const label = entry?.payload?.label ?? entry?.label;
                      if (!label) return;
                      router.push(`/${lang}/dashboard/patients?risk=${encodeURIComponent(String(label))}`);
                    }}
                  >
                    {riskData.map((slice, idx) => (
                      <Cell key={`${slice.label}-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-black text-slate-900">
                {isEnglish ? "Clinical Quality Trend" : "임상 성과 추이"}
              </h2>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={qualityTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" stroke="#64748b" />
                  <YAxis domain={[0, 100]} stroke="#64748b" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="quality"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#4f46e5" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-black text-slate-900">
                {isEnglish ? "Risk Type Frequency (Bar)" : "유형별 리스크 검출 빈도"}
              </h2>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip />
                  <Bar
                    dataKey="value"
                    fill="#4f46e5"
                    radius={[8, 8, 0, 0]}
                    onClick={(entry: any) => {
                      const label = entry?.label ?? entry?.payload?.label;
                      if (!label) return;
                      router.push(`/${lang}/dashboard/patients?risk=${encodeURIComponent(String(label))}`);
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>
      )}
    </div>
  );
}
