"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useInView } from "react-intersection-observer";
import { formatDistanceToNow } from "date-fns";
import { enUS, ko } from "date-fns/locale";
import { ChevronDown, ChevronUp, Heart, MessageCircle, Eye } from "lucide-react";
import type { Tables } from "@/types/supabase";
import type { getDictionary } from "@/dictionaries/getDictionary";
import { createClient as createSupabaseClient } from "@/utils/supabase/client";

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

type CommunityPost = Tables<"community_posts">;
type CommunityCopy = Dictionary["dashboard"]["community"];

type Props = {
  dict: Dictionary;
  lang: string;
};

const READ_MORE_THRESHOLD = 140;

function previewText(content: CommunityPost["content"]): string {
  const pickFromObject = (obj: Record<string, unknown>): string => {
    const chunk = obj.assessment ?? obj.anonymized_subjective ?? obj.subjective ?? obj.objective ?? obj.plan;
    return typeof chunk === "string" ? chunk.trim() : "";
  };

  if (content == null) return "";
  if (typeof content === "string") {
    const trimmed = content.trim();
    if (!trimmed) return "";
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const extracted = pickFromObject(parsed as Record<string, unknown>);
        return extracted || trimmed;
      }
    } catch {
      // fall through: plain text content
    }
    return trimmed;
  }
  if (typeof content === "object" && !Array.isArray(content)) {
    return pickFromObject(content as Record<string, unknown>);
  }
  return "";
}

function formatPostedAt(iso: string, locale: typeof ko | typeof enUS): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale });
  } catch {
    return "";
  }
}

function FeedPostCard({
  post,
  body,
  d,
  dateLocale,
  expanded,
  onToggleExpand,
  detailHref,
  canDelete,
  deleting,
  onDelete,
}: {
  post: CommunityPost;
  body: string;
  d: CommunityCopy;
  dateLocale: typeof ko | typeof enUS;
  expanded: boolean;
  onToggleExpand: () => void;
  detailHref: string;
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  const display = body.trim() || "—";
  const canExpand = display.length > READ_MORE_THRESHOLD;

  const mainBlock = (
    <>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-transparent to-zinc-50/30 opacity-0 transition group-hover:opacity-100" aria-hidden />

      <div className="relative px-4 pb-3 pt-4 transition group-hover:bg-zinc-50/30 sm:px-5 sm:pt-5">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-lg shadow-inner ring-2 ring-white/60"
            aria-hidden
          >
            <span className="drop-shadow-sm">👤</span>
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p className="truncate text-[15px] font-semibold tracking-tight text-zinc-900">{d.cardAuthor}</p>
              <span className="text-zinc-300" aria-hidden>
                ·
              </span>
              <time
                className="text-xs font-medium text-zinc-400 tabular-nums"
                dateTime={post.created_at}
                suppressHydrationWarning
              >
                {formatPostedAt(post.created_at, dateLocale)}
              </time>
            </div>
            <div className="mt-3">
              <Link
                href={detailHref}
                className="block rounded-xl outline-none ring-zinc-900/5 transition hover:ring-2 focus-visible:ring-2 focus-visible:ring-indigo-400"
                aria-label={d.readMore}
              >
                <p
                  className={`whitespace-pre-wrap text-[15px] leading-relaxed tracking-[-0.01em] text-zinc-800 antialiased ${
                    expanded ? "" : "line-clamp-4"
                  }`}
                >
                  {display}
                </p>
              </Link>
              {canExpand ? (
                <button
                  type="button"
                  onClick={onToggleExpand}
                  className="mt-2.5 inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 hover:text-indigo-900 active:scale-[0.98]"
                >
                  {expanded ? (
                    <>
                      {d.readLess}
                      <ChevronUp className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                    </>
                  ) : (
                    <>
                      {d.readMore}
                      <ChevronDown className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                    </>
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.04)] transition duration-300 hover:border-zinc-300/90 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="relative block rounded-t-3xl">{mainBlock}</div>

      <div className="relative flex items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50/40 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-1 sm:gap-5">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-semibold text-zinc-500 transition hover:bg-rose-50 hover:text-rose-600"
          >
            <Heart className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
            <span>
              {post.likes}
              <span className="ml-1 hidden font-medium text-zinc-400 sm:inline">{d.likeLabel}</span>
            </span>
          </button>
          <Link
            href={detailHref}
            className="inline-flex min-w-0 max-w-[55%] items-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-semibold text-zinc-500 transition hover:bg-sky-50 hover:text-sky-700 sm:max-w-none"
          >
            <MessageCircle className="h-[18px] w-[18px] shrink-0" strokeWidth={2} aria-hidden />
            <span className="truncate">{d.askAdvice}</span>
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs font-medium tabular-nums text-zinc-400">
          {canDelete ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="text-xs font-medium text-zinc-400 transition hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              삭제
            </button>
          ) : null}
          <Eye className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          <span>
            {post.views} {d.viewsLabel}
          </span>
        </div>
      </div>
    </article>
  );
}

export function CommunityFeedClient({ dict, lang }: Props) {
  const d = dict.dashboard.community;
  const dateLocale = lang === "en" ? enUS : ko;
  const supabase = useMemo(() => createSupabaseClient(), []);

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sort, setSort] = useState<"latest" | "popular">("latest");
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [expandedById, setExpandedById] = useState<Record<string, boolean>>({});

  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  const initialReadyRef = useRef(false);
  const hasMoreRef = useRef(true);
  const prevInView = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!cancelled) {
          setCurrentUserId(user?.id ?? null);
        }
      } catch {
        if (!cancelled) setCurrentUserId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    setExpandedById({});
  }, [sort]);

  const appendNext = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current || !initialReadyRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const p = pageRef.current;
      const res = await fetch(`/api/community/feed?sort=${sort}&page=${p}`);
      const data = (await res.json()) as {
        success?: boolean;
        posts?: CommunityPost[];
        hasMore?: boolean;
      };
      if (!data.success || !Array.isArray(data.posts)) return;
      const batch = data.posts as CommunityPost[];
      setPosts((prev) => [...prev, ...batch]);
      const more = Boolean(data.hasMore);
      setHasMore(more);
      hasMoreRef.current = more;
      pageRef.current = p + 1;
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [sort]);

  useEffect(() => {
    let cancelled = false;
    prevInView.current = false;
    initialReadyRef.current = false;
    pageRef.current = 1;
    setHasMore(true);
    hasMoreRef.current = true;
    setPosts([]);
    setInitialLoading(true);
    loadingRef.current = false;

    (async () => {
      try {
        const res = await fetch(`/api/community/feed?sort=${sort}&page=1`);
        const data = (await res.json()) as {
          success?: boolean;
          posts?: CommunityPost[];
          hasMore?: boolean;
        };
        if (cancelled) return;
        if (data.success && Array.isArray(data.posts)) {
          setPosts(data.posts);
          const more = Boolean(data.hasMore);
          setHasMore(more);
          hasMoreRef.current = more;
          pageRef.current = 2;
        }
      } finally {
        if (!cancelled) {
          initialReadyRef.current = true;
          setInitialLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sort]);

  const { ref: sentinelRef, inView } = useInView({
    threshold: 0,
    rootMargin: "160px 0px 0px 0px",
  });

  useEffect(() => {
    if (initialLoading) {
      prevInView.current = false;
      return;
    }
    if (!initialReadyRef.current) return;

    const entered = inView && !prevInView.current;
    prevInView.current = inView;

    if (entered && hasMoreRef.current && !loadingRef.current) {
      void appendNext();
    }
  }, [inView, initialLoading, appendNext]);

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-gradient-to-b from-zinc-100 via-zinc-50 to-white pb-24">
      <header className="sticky top-0 z-20 flex border-b border-zinc-200/80 bg-white/85 px-1 text-center text-[15px] font-semibold shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
        <button
          type="button"
          onClick={() => setSort("latest")}
          className={`relative flex-1 py-3.5 transition ${
            sort === "latest" ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
          }`}
        >
          {sort === "latest" ? (
            <span className="absolute bottom-0 left-1/2 h-0.5 w-12 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600" />
          ) : null}
          <span className="relative">{d.tabLatest}</span>
        </button>
        <button
          type="button"
          onClick={() => setSort("popular")}
          className={`relative flex-1 py-3.5 transition ${
            sort === "popular" ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
          }`}
        >
          {sort === "popular" ? (
            <span className="absolute bottom-0 left-1/2 h-0.5 w-12 -translate-x-1/2 rounded-full bg-gradient-to-r from-rose-500 to-amber-500" />
          ) : null}
          <span className="relative">{d.tabPopular}</span>
        </button>
      </header>

      {initialLoading ? (
        <div className="flex flex-col items-center gap-3 px-4 py-16">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-zinc-200 border-t-indigo-600" aria-hidden />
          <p className="text-sm font-medium text-zinc-500">{d.initialLoading}</p>
        </div>
      ) : posts.length === 0 ? (
        <p className="px-6 py-16 text-center text-sm leading-relaxed text-zinc-500">{d.emptyFeed}</p>
      ) : (
        <ul className="flex flex-col gap-5 px-3 py-5 sm:px-4">
          {posts.map((post) => (
            <li key={post.id}>
              <FeedPostCard
                post={post}
                body={previewText(post.content)}
                d={d}
                dateLocale={dateLocale}
                expanded={Boolean(expandedById[post.id])}
                onToggleExpand={() =>
                  setExpandedById((prev) => ({
                    ...prev,
                    [post.id]: !prev[post.id],
                  }))
                }
                canDelete={currentUserId != null && post.author_id === currentUserId}
                deleting={deletingPostId === post.id}
                onDelete={() => {
                  if (!window.confirm("이 케이스를 커뮤니티에서 정말 삭제하시겠습니까?")) return;
                  setDeletingPostId(post.id);
                  void (async () => {
                    try {
                      const res = await fetch("/api/community/post", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ postId: post.id }),
                      });
                      const data = (await res.json()) as { success?: boolean; message?: string };
                      if (!res.ok || !data.success) {
                        alert(data.message ?? "삭제 중 오류가 발생했습니다.");
                        return;
                      }
                      setPosts((prev) => prev.filter((p) => p.id !== post.id));
                    } catch {
                      alert("삭제 중 오류가 발생했습니다.");
                    } finally {
                      setDeletingPostId(null);
                    }
                  })();
                }}
                detailHref={`/${lang}/community/${post.id}`}
              />
            </li>
          ))}
        </ul>
      )}

      {!initialLoading && hasMore ? (
        <div
          ref={sentinelRef}
          className={`flex min-h-[3rem] flex-col items-center justify-center gap-2 py-8 text-sm font-medium text-zinc-400 ${
            loadingMore ? "animate-pulse" : ""
          }`}
        >
          {loadingMore ? (
            <>
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-indigo-500" aria-hidden />
              <span>{d.loadingMore}</span>
            </>
          ) : (
            <span className="select-none text-zinc-300">· · ·</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
