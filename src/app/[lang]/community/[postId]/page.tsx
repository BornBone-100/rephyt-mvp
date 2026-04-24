import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/dictionaries/getDictionary";
import { createClient } from "@/utils/supabase/server";
import type { Tables } from "@/types/supabase";
import { CommunityCommentsSection } from "./community-comments-section";

type CommunityPost = Tables<"community_posts">;

function formatCaseContent(content: CommunityPost["content"]): string {
  if (content == null || typeof content !== "object" || Array.isArray(content)) {
    return typeof content === "string" ? content : "";
  }
  const c = content as Record<string, unknown>;
  const blocks: string[] = [];
  const order = ["anonymized_subjective", "subjective", "objective", "assessment", "plan"] as const;
  for (const key of order) {
    const v = c[key];
    if (typeof v === "string" && v.trim()) {
      blocks.push(v.trim());
    }
  }
  if (blocks.length > 0) return blocks.join("\n\n—\n\n");
  try {
    return JSON.stringify(content, null, 2);
  } catch {
    return "";
  }
}

export default async function CommunityPostDetailPage({
  params,
}: Readonly<{
  params: Promise<{ lang: string; postId: string }>;
}>) {
  const { lang, postId } = await params;
  const locale = lang === "en" || lang === "ko" ? lang : "ko";
  const dict = await getDictionary(locale);
  const d = dict.dashboard.community;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // 1. 게시글 가져오기
  const { data: post, error } = await supabase
    .from("community_posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (error || !post) {
    console.error("게시글 조회 에러:", error);
    return notFound();
  }
  const typedPost = post as CommunityPost;
  const postWithReport = post as CommunityPost & { report_id?: string | null };
  const postWithImage = post as CommunityPost & { image_url?: string | null };

  type AiLog = {
    diagnosis_area?: string | null;
    overall_score?: number | null;
    clinical_reasoning?: string | null;
    differential_diagnosis?: string | null;
    intervention_strategy?: string | null;
    professional_discussion?: string | null;
    created_at?: string | null;
    evaluation?: string | null;
    intervention_recommendation?: string | null;
    neuro_exam?: string | null;
    neurodynamic_test?: string | null;
    raw_ai_response?: unknown;
  };
  // 💡 Join에 의존하지 않고, ID를 가지고 직접 다시 한번 찾아옵니다.
  let reportData: AiLog | null = null;
  if (postWithReport.report_id) {
    const { data: report } = await supabase
      .from("cdss_guardrail_logs")
      .select("*")
      .eq("id", postWithReport.report_id)
      .single();
    reportData = report;
  }

  const { data: commentsRaw } = await supabase
    .from("community_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  const comments = (commentsRaw ?? []) as Tables<"community_comments">[];
  const caseText = formatCaseContent(typedPost.content);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 via-zinc-50 to-white px-4 py-8 pb-20 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/${locale}/dashboard/community`}
          className="mb-6 inline-flex text-sm font-semibold text-indigo-700 transition hover:text-indigo-900"
        >
          {d.postDetailBackToFeed}
        </Link>

        <article className="overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-sm">
          <div className="border-b border-zinc-100 bg-zinc-50/50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {d.pageTitle}
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-zinc-900">{d.postDetailCaseTitle}</h1>
          </div>
          <div className="px-5 py-6">
            {postWithImage.image_url && (
              <div className="mb-8 overflow-hidden rounded-2xl border border-zinc-100 shadow-md">
                <img src={postWithImage.image_url} alt="Clinical Evidence" className="h-auto w-full object-cover" />
                <div className="bg-zinc-50 p-3 text-[10px] font-medium italic text-zinc-400">📸 Attached Clinical Photo</div>
              </div>
            )}

            <pre className="mb-10 whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-800">
              {caseText || "—"}
            </pre>

            {reportData &&
              (() => {
                let raw: Record<string, unknown> = {};
                try {
                  raw = typeof reportData.raw_ai_response === "string"
                    ? (JSON.parse(reportData.raw_ai_response) as Record<string, unknown>)
                    : ((reportData.raw_ai_response as Record<string, unknown> | null) ?? {});
                } catch {
                  raw = {};
                }
                const res =
                  raw.result && typeof raw.result === "object" && !Array.isArray(raw.result)
                    ? (raw.result as Record<string, unknown>)
                    : {};

                const screening =
                  reportData.differential_diagnosis ||
                  (res.differentialDiagnosis as string | undefined) ||
                  "데이터 분석 중...";
                const intervention =
                  reportData.intervention_strategy ||
                  (res.interventionStrategy as string | undefined) ||
                  "중재 전략 데이터 없음";
                const reasoning =
                  reportData.clinical_reasoning || (res.clinicalReasoning as string | undefined) || "분석 소견 데이터 없음";
                const discussion =
                  reportData.professional_discussion ||
                  (res.professionalDiscussion as string | undefined) ||
                  "전문가 의견 데이터 없음";
                const score = reportData.overall_score || (res.overallScore as number | undefined) || 0;

                return (
                  <div className="mt-12 space-y-10 border-t-2 border-indigo-100 pt-12">
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-1.5 rounded-full bg-indigo-600" />
                      <h2 className="text-xl font-black uppercase italic text-slate-900">Clinical Analysis Report</h2>
                    </div>

                    <section className="rounded-2xl border border-slate-100 bg-slate-50 p-6 shadow-sm">
                      <div className="mb-4 flex items-center gap-2 font-bold text-slate-800">
                        <span>🛡️</span> 감별 진단 및 스크리닝
                      </div>
                      <div className="whitespace-pre-wrap rounded-xl border border-slate-50 bg-white p-5 text-sm leading-relaxed text-slate-700">
                        {screening}
                      </div>
                    </section>

                    <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-6 shadow-sm">
                      <div className="mb-4 flex items-center gap-2 font-bold text-indigo-900">
                        <span>💡</span> 중재 전략 심층 분석
                      </div>
                      <div className="whitespace-pre-wrap rounded-xl border border-indigo-50 bg-white/80 p-5 text-sm font-medium leading-relaxed text-slate-800">
                        {intervention}
                      </div>
                    </section>

                    <section className="rounded-2xl border border-slate-100 bg-slate-50 p-6 shadow-sm">
                      <div className="mb-4 flex items-center gap-2 font-bold text-slate-800">
                        <span>🧠</span> 전문가 제언 및 예후
                      </div>
                      <div className="whitespace-pre-wrap rounded-xl border border-slate-50 bg-white p-5 text-sm leading-relaxed text-slate-700">
                        {discussion}
                      </div>
                    </section>

                    <section className="rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-900 p-8 text-white shadow-xl">
                      <div className="mb-5 flex items-center gap-2 font-bold text-indigo-100">
                        <span>🔍</span> 임상 추론 상세 분석
                      </div>
                      <div className="mb-6 whitespace-pre-wrap rounded-2xl border border-white/20 bg-white/10 p-6 text-sm font-medium italic leading-relaxed backdrop-blur-md">
                        "{reasoning}"
                      </div>
                      <div className="flex items-end justify-between">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">
                          Precise Care / Data is Honest
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium tracking-tighter text-indigo-200">Compliance Score</div>
                          <div className="text-4xl font-black">{score}점</div>
                        </div>
                      </div>
                    </section>
                  </div>
                );
              })()}
          </div>
        </article>

        <CommunityCommentsSection
          postId={postId}
          locale={locale}
          dict={dict}
          initialComments={comments}
          currentUserId={user?.id ?? null}
        />
      </div>
    </div>
  );
}
