import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import ActivityTimelineClient from "./activity-timeline-client";

type ActivityItem = {
  id: string;
  type: "report" | "community" | "export";
  createdAt: string;
  title: string;
  description: string;
  evaluation_area?: string | null;
  care_guide?: string | null;
  evaluation_data?: { rom?: number | string | null } | null;
  reportId?: string;
  patientId?: string;
  href?: string;
};

export const dynamic = "force-dynamic";

function formatRelative(iso: string, locale: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.round(diffMs / (1000 * 60));
  const rtf = new Intl.RelativeTimeFormat(locale === "en" ? "en" : "ko", { numeric: "auto" });

  if (Math.abs(mins) < 60) return rtf.format(-mins, "minute");
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return rtf.format(-hours, "hour");
  const days = Math.round(hours / 24);
  return rtf.format(-days, "day");
}

function scoreBadge(value: number) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  return {
    value: safe,
    tone:
      safe >= 80
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : safe >= 60
          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
          : "bg-amber-50 text-amber-700 border-amber-200",
  };
}

export default async function ActivityPage({
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

  const base = `/${locale}`;

  if (!user) {
    return (
      <div className="p-8">
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black text-slate-900">Re:PhyT Activity</h1>
          <p className="mt-3 text-sm text-slate-600">로그인이 필요합니다.</p>
          <Link
            href={`${base}/login`}
            className="mt-4 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
          >
            로그인하기
          </Link>
        </section>
      </div>
    );
  }

  const reportRes = await (supabase as any)
    .from("cdss_guardrail_logs")
    .select("id, created_at, patient_id, has_red_flag, overall_score, compliance_score, author_id")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const postRes = await (supabase as any)
    .from("community_posts")
    .select("id, created_at, likes, views, author_id, evaluation_area, care_guide, evaluation_data")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const exportRes = await (supabase as any)
    .from("soap_notes")
    .select("id, patient_id, created_at, is_shared, created_by")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const reports = Array.isArray(reportRes.data) ? reportRes.data : [];
  const posts = Array.isArray(postRes.data) ? postRes.data : [];
  const exports = Array.isArray(exportRes.data) ? exportRes.data : [];
  const activityRes = await (supabase as any)
    .from("patient_activities")
    .select("id, created_at, activity_type, title, description, metadata, patient_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);
  const activityLogs = Array.isArray(activityRes.data) ? activityRes.data : [];

  const totalReports = reports.length;
  const riskDetectedCases = reports.filter((row: any) => Boolean(row?.has_red_flag)).length;
  const communityShared = posts.length;
  const contributionScore = posts.reduce((sum: number, row: any) => sum + Number(row?.likes ?? 0) + Number(row?.views ?? 0), 0);

  const avgSafety = totalReports
    ? reports.reduce((sum: number, row: any) => sum + Number(row?.overall_score ?? 0), 0) / totalReports
    : 0;
  const avgCpg = totalReports
    ? reports.reduce((sum: number, row: any) => sum + Number(row?.compliance_score ?? 0), 0) / totalReports
    : 0;

  const safety = scoreBadge(avgSafety);
  const cpg = scoreBadge(avgCpg);

  const timeline: ActivityItem[] = [
    ...activityLogs.map((row: any) => ({
      id: `activity-${row.id}`,
      type: "report" as const,
      createdAt: row.created_at,
      title: row.title ?? (locale === "en" ? "Clinical filter report generated" : "임상 필터 리포트를 생성했습니다."),
      description: row.description ?? "",
      reportId: row.metadata?.report_id ?? undefined,
      patientId: row.patient_id ?? row.metadata?.patient_id ?? undefined,
      href:
        row.patient_id && row.metadata?.report_id
          ? `${base}/dashboard/patients/${encodeURIComponent(String(row.patient_id))}?reportId=${encodeURIComponent(String(row.metadata.report_id))}`
          : row.patient_id
            ? `${base}/dashboard/patients/${encodeURIComponent(String(row.patient_id))}`
            : undefined,
    })),
    ...reports.map((row: any) => ({
      id: `report-${row.id}`,
      type: "report" as const,
      createdAt: row.created_at,
      title: locale === "en" ? "Clinical filter report generated" : "임상 필터 리포트를 생성했습니다.",
      description:
        locale === "en"
          ? `Patient ID: ${row.patient_id ?? "-"}`
          : `환자 ID: ${row.patient_id ?? "-"}`,
      reportId: row.id,
      patientId: row.patient_id ?? undefined,
      href: `${base}/dashboard/patients/${encodeURIComponent(String(row.patient_id ?? ""))}?reportId=${encodeURIComponent(String(row.id ?? ""))}`,
    })),
    ...posts.map((row: any) => ({
      id: `community-${row.id}`,
      type: "community" as const,
      createdAt: row.created_at,
      title: locale === "en" ? "Shared a case in community" : "케이스를 커뮤니티에 공유했습니다.",
      description:
        locale === "en"
          ? `Engagement ${Number(row.likes ?? 0) + Number(row.views ?? 0)}`
          : `참여도 ${Number(row.likes ?? 0) + Number(row.views ?? 0)} (좋아요+조회수)`,
      evaluation_area: row.evaluation_area ?? "General Evaluation",
      care_guide: row.care_guide ?? "준비된 가이드가 없습니다.",
      evaluation_data: row.evaluation_data ?? { rom: locale === "en" ? "No measurement" : "측정치 없음" },
      href: `${base}/community/${row.id}`,
    })),
    ...exports.map((row: any) => ({
      id: `export-${row.id}`,
      type: "export" as const,
      createdAt: row.created_at,
      title: locale === "en" ? "Report export history" : "리포트 내보내기 이력",
      description:
        locale === "en"
          ? `SOAP chart ${row.id.slice(0, 8)}...`
          : `SOAP 차트 ${row.id.slice(0, 8)}...`,
      href: `${base}/dashboard/soap/${row.id}`,
    })),
  ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return (
    <div className="min-h-screen bg-zinc-50 p-4 pb-10 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black text-slate-900">
            Re:PhyT - PRACTICE SAFETY & CLINICAL FILTER
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {locale === "en"
              ? "Professional footprint of your daily clinical decisions."
              : "치료사의 전문성을 증명하는 임상 활동 아카이브"}
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">총 임상 필터 리포트</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{totalReports}</p>
          </article>
          <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">리스크 감지 케이스</p>
            <p className="mt-2 text-2xl font-black text-indigo-600">{riskDetectedCases}</p>
          </article>
          <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">커뮤니티 공유</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{communityShared}</p>
          </article>
          <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">누적 기여 점수</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{contributionScore}</p>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-900">삭감 방어 및 안전 지표</h2>
            <div className="mt-4 grid gap-3">
              <div className="rounded-xl border border-slate-100 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">평균 안전 지수</span>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${safety.tone}`}>{safety.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${safety.value}%` }} />
                </div>
              </div>
              <div className="rounded-xl border border-slate-100 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">평균 CPG 준수율</span>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${cpg.tone}`}>{cpg.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-slate-800" style={{ width: `${cpg.value}%` }} />
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-900">내보내기 이력</h2>
            <div className="mt-4 space-y-2">
              {exports.slice(0, 6).map((row: any) => (
                <Link
                  key={row.id}
                  href={`${base}/dashboard/soap/${row.id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">📄 SOAP 리포트 {row.id.slice(0, 8)}...</p>
                    <p className="text-xs text-slate-500">{formatRelative(row.created_at, locale)}</p>
                  </div>
                  <span className="text-xs font-bold text-indigo-600">다시 열기</span>
                </Link>
              ))}
              {exports.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">
                  아직 내보내기 이력이 없습니다.
                </p>
              ) : null}
            </div>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black text-slate-900">최근 활동 타임라인</h2>
          {timeline.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center">
              <p className="text-sm font-semibold text-slate-600">
                Re:PhyT와 함께 첫 번째 임상 리포트를 작성해 보세요!
              </p>
              <Link
                href={`${base}/dashboard/soap/new`}
                className="mt-4 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
              >
                리포트 작성하기
              </Link>
            </div>
          ) : <ActivityTimelineClient initialTimeline={timeline.slice(0, 20)} locale={locale} />}
        </section>
      </div>
    </div>
  );
}
