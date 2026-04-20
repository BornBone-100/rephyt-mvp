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
  const { data: post, error: postError } = await supabase
    .from("community_posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();

  if (postError || !post) {
    notFound();
  }

  const { data: commentsRaw } = await supabase
    .from("community_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  const comments = (commentsRaw ?? []) as Tables<"community_comments">[];
  const caseText = formatCaseContent(post.content);

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
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-800">
              {caseText || "—"}
            </pre>
          </div>
        </article>

        <CommunityCommentsSection postId={postId} locale={locale} dict={dict} initialComments={comments} />
      </div>
    </div>
  );
}
