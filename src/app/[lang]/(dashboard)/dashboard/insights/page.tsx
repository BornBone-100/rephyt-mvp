import { createClient } from "@/utils/supabase/server";
import type { Json } from "@/types/supabase-generated";
import InsightsDashboardClient from "./insights-dashboard-client";

type CdssLogRow = {
  id: string;
  diagnosis_area: string | null;
  has_red_flag: boolean | null;
  overall_score: number | null;
  compliance_score: number | null;
  predictive_trajectory: Json | null;
  created_at: string;
};

type CommunityPostRow = {
  id: string;
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default async function ClinicalInsightsPage({
  params,
}: Readonly<{
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  const locale = lang === "en" || lang === "ko" ? lang : "ko";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const emptyPayload = {
    totalScreenings: 0,
    avgSafetyIndex: 0,
    avgDefenseScore: 0,
    recoveryPredictionAccuracy: 0,
    totalCommunityPosts: 0,
  };

  if (!user) {
    return (
      <div className="p-8">
        <InsightsDashboardClient
          lang={locale}
          summary={emptyPayload}
          riskDistribution={[]}
          qualityTrend={[]}
        />
      </div>
    );
  }

  const logsByUserId = await (supabase as any)
    .from("cdss_guardrail_logs")
    .select("id, diagnosis_area, has_red_flag, overall_score, compliance_score, predictive_trajectory, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  let logsData = (logsByUserId.data ?? []) as CdssLogRow[];
  if (logsByUserId.error) {
    // 일부 환경에는 author_id 기준이 남아 있을 수 있어 fallback을 둔다.
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

  let postsData = (postsByUserId.data ?? []) as CommunityPostRow[];
  if (postsByUserId.error) {
    const postsByAuthorId = await (supabase as any)
      .from("community_posts")
      .select("id")
      .eq("author_id", user.id);
    postsData = (postsByAuthorId.data ?? []) as CommunityPostRow[];
  }

  const totalScreenings = logsData.length;
  const totalCommunityPosts = postsData.length;

  const avgSafetyIndex = clampPercent(
    totalScreenings > 0
      ? logsData.reduce((sum, row) => sum + (row.overall_score ?? 0), 0) / totalScreenings
      : 0,
  );

  const avgDefenseScore = clampPercent(
    totalScreenings > 0
      ? logsData.reduce((sum, row) => sum + (row.compliance_score ?? row.overall_score ?? 0), 0) / totalScreenings
      : 0,
  );

  const predictedCount = logsData.filter((row) => {
    const p = row.predictive_trajectory;
    return Boolean(p && typeof p === "object");
  }).length;

  const recoveryPredictionAccuracy = clampPercent(
    totalScreenings > 0
      ? (predictedCount / totalScreenings) * 100
      : 0,
  );

  const riskMap = new Map<string, number>();
  for (const row of logsData) {
    const key = row.diagnosis_area?.trim() || "미분류";
    const score = row.has_red_flag ? 2 : 1;
    riskMap.set(key, (riskMap.get(key) ?? 0) + score);
  }

  const riskDistribution = [...riskMap.entries()]
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

  const qualityTrend = [...monthMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([period, agg]) => ({
      period,
      quality: clampPercent(agg.total / Math.max(1, agg.count)),
    }));

  return (
    <div className="p-6 md:p-8">
      <InsightsDashboardClient
        lang={locale}
        summary={{
          totalScreenings,
          avgSafetyIndex,
          avgDefenseScore,
          recoveryPredictionAccuracy,
          totalCommunityPosts,
        }}
        riskDistribution={riskDistribution}
        qualityTrend={qualityTrend}
      />
    </div>
  );
}
