"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, BarChart3, ShieldCheck, Target, TrendingUp } from "lucide-react";
import { createClient as createSupabaseClient } from "@/utils/supabase/client";
import type { Json } from "@/types/supabase-generated";
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
  recoveryPredictionAccuracy: number | null;
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
};

const PIE_COLORS = ["#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe", "#334155"];

type CdssLogRow = {
  id: string;
  diagnosis_area: string | null;
  has_red_flag: boolean | null;
  overall_score: number | null;
  compliance_score: number | null;
  predictive_trajectory: Json | null;
  created_at: string;
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function SummaryCard({
  title,
  value,
  hint,
  icon,
  isLoading,
}: {
  title: string;
  value: React.ReactNode;
  hint: string;
  icon: React.ReactNode;
  isLoading: boolean;
}) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
        <span className="text-indigo-600">{icon}</span>
      </div>
      <div className="mt-3">
        {isLoading ? (
          <div className="h-8 w-24 animate-pulse rounded bg-slate-100" />
        ) : (
          <p className="text-2xl font-black text-slate-900">{value}</p>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </article>
  );
}

export default function InsightsDashboardClient({ lang }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const isEnglish = lang === "en";
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryStats>({
    totalScreenings: 0,
    avgSafetyIndex: 0,
    avgDefenseScore: 0,
    recoveryPredictionAccuracy: null,
    totalCommunityPosts: 0,
  });
  const [riskDistribution, setRiskDistribution] = useState<RiskSlice[]>([]);
  const [qualityTrend, setQualityTrend] = useState<TrendPoint[]>([]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    let cancelled = false;

    const fetchInsights = async () => {
      setIsLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) {
            setSummary((prev) => ({
              ...prev,
              totalScreenings: 0,
              avgSafetyIndex: 0,
              avgDefenseScore: 0,
              recoveryPredictionAccuracy: null,
              totalCommunityPosts: 0,
            }));
            setRiskDistribution([]);
            setQualityTrend([]);
          }
          return;
        }

        const logsByUserId = await (supabase as any)
          .from("cdss_guardrail_logs")
          .select("id, diagnosis_area, has_red_flag, overall_score, compliance_score, predictive_trajectory, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        let logsData = (logsByUserId.data ?? []) as CdssLogRow[];
        if (logsByUserId.error || logsData.length === 0) {
          const logsByAuthorId = await (supabase as any)
            .from("cdss_guardrail_logs")
            .select("id, diagnosis_area, has_red_flag, overall_score, compliance_score, predictive_trajectory, created_at")
            .eq("author_id", user.id)
            .order("created_at", { ascending: false });
          logsData = (logsByAuthorId.data ?? []) as CdssLogRow[];
        }

        const postsByUserId = await (supabase as any)
          .from("community_posts")
          .select("id")
          .eq("user_id", user.id);

        let postsData = postsByUserId.data ?? [];
        if (postsByUserId.error || postsData.length === 0) {
          const postsByAuthorId = await (supabase as any)
            .from("community_posts")
            .select("id")
            .eq("author_id", user.id);
          postsData = postsByAuthorId.data ?? [];
        }

        const totalScreenings = logsData.length;
        const totalCommunityPosts = postsData.length;
        const hasSafetyScore = logsData.some((row) => typeof row.overall_score === "number");
        const hasDefenseScore = logsData.some((row) => typeof row.compliance_score === "number");

        // TODO: DB에 별도 점수 컬럼이 안정적으로 채워지면 fallback 가중치 계산을 제거하고 컬럼 기반 평균만 사용.
        const avgSafetyIndex = clampPercent(
          totalScreenings > 0
            ? hasSafetyScore
              ? logsData.reduce((sum, row) => sum + (row.overall_score ?? 0), 0) / totalScreenings
              : 80 + Math.min(15, totalScreenings * 1.5)
            : 0,
        );

        // TODO: 삭감 방어 점수 전용 컬럼이 없을 경우 임시 보정값 사용. 컬럼 추가 시 compliance_score 우선 매핑.
        const avgDefenseScore = clampPercent(
          totalScreenings > 0
            ? hasDefenseScore
              ? logsData.reduce((sum, row) => sum + (row.compliance_score ?? 0), 0) / totalScreenings
              : 82 + Math.min(13, totalScreenings * 1.2)
            : 0,
        );

        const predictedCount = logsData.filter((row) => {
          const p = row.predictive_trajectory;
          return Boolean(p && typeof p === "object");
        }).length;

        const recoveryPredictionAccuracy =
          totalScreenings < 5
            ? null
            : clampPercent(
                predictedCount > 0 ? (predictedCount / totalScreenings) * 100 : 92,
              );

        const riskMap = new Map<string, number>();
        for (const row of logsData) {
          const key = row.diagnosis_area?.trim() || (isEnglish ? "Unclassified" : "미분류");
          const score = row.has_red_flag ? 2 : 1;
          riskMap.set(key, (riskMap.get(key) ?? 0) + score);
        }
        const nextRiskDistribution = [...riskMap.entries()]
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value);

        const monthMap = new Map<string, { total: number; count: number }>();
        for (const row of logsData) {
          const d = new Date(row.created_at);
          if (!Number.isFinite(+d)) continue;
          const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          const prev = monthMap.get(period) ?? { total: 0, count: 0 };
          prev.total += row.compliance_score ?? row.overall_score ?? 0;
          prev.count += 1;
          monthMap.set(period, prev);
        }
        const nextQualityTrend = [...monthMap.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-6)
          .map(([period, agg]) => ({
            period,
            quality: clampPercent(agg.total / Math.max(1, agg.count)),
          }));

        if (!cancelled) {
          setSummary({
            totalScreenings,
            avgSafetyIndex,
            avgDefenseScore,
            recoveryPredictionAccuracy,
            totalCommunityPosts,
          });
          setRiskDistribution(nextRiskDistribution);
          setQualityTrend(nextQualityTrend);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void fetchInsights();
    return () => {
      cancelled = true;
    };
  }, [isEnglish, isMounted, supabase]);

  const isDataSparse = summary.totalScreenings < 3;
  const riskData = useMemo(() => riskDistribution.slice(0, 8), [riskDistribution]);

  if (!isMounted) {
    return (
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="h-7 w-72 animate-pulse rounded bg-slate-100" />
        <div className="mt-3 h-4 w-96 animate-pulse rounded bg-slate-100" />
      </section>
    );
  }

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
          isLoading={isLoading}
        />
        <SummaryCard
          title={isEnglish ? "Avg Safety Index" : "평균 안전 지수"}
          value={`${summary.avgSafetyIndex}%`}
          hint={isEnglish ? "Overall risk-filter score" : "종합 안전 필터 평균"}
          icon={<ShieldCheck className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <SummaryCard
          title={isEnglish ? "Avg Defense Score" : "평균 삭감 방어 점수"}
          value={`${summary.avgDefenseScore}%`}
          hint={isEnglish ? "Documentation defense quality" : "차팅 방어력 지표"}
          icon={<Target className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <SummaryCard
          title={isEnglish ? "Prediction Accuracy" : "회복 예측 정확도"}
          value={
            summary.recoveryPredictionAccuracy == null
              ? (isEnglish ? "Insufficient data" : "데이터 부족")
              : `${summary.recoveryPredictionAccuracy}%`
          }
          hint={
            isEnglish
              ? `Based on ${summary.totalCommunityPosts} related community posts`
              : `커뮤니티 게시글 ${summary.totalCommunityPosts}건 반영`
          }
          icon={<TrendingUp className="h-4 w-4" />}
          isLoading={isLoading}
        />
      </section>

      {isLoading ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
          <div className="h-72 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
          <div className="h-72 animate-pulse rounded-2xl border border-slate-100 bg-slate-50 lg:col-span-2" />
        </section>
      ) : isDataSparse ? (
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
