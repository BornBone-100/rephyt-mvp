"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useInView } from "react-intersection-observer";
import { formatDistanceToNow } from "date-fns";
import { enUS, ko } from "date-fns/locale";
import { ChevronDown, ChevronUp, Heart, MessageCircle, Eye, FileText, Check, X } from "lucide-react";
import type { Tables } from "@/types/supabase";
import type { getDictionary } from "@/dictionaries/getDictionary";
import { createClient as createSupabaseClient } from "@/utils/supabase/client";
import { ReportSelectionModal } from "@/components/dashboard/ReportSelectionModal";
import { PostMenu } from "@/components/community/PostMenu";
import { uploadMedia } from "@/lib/supabase/storage";
import {
  PhotoUploadGuideline,
  getPhotoUploadGuidelineConsentMessage,
} from "@/components/upload/PhotoUploadGuideline";

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

type CommunityPost = Tables<"community_posts">;
type CommunityCopy = Dictionary["dashboard"]["community"];

type Props = {
  dict: Dictionary;
  lang: string;
};

const READ_MORE_THRESHOLD = 140;
const BODY_PARTS = ["All", "Neck", "Shoulder", "LBP", "Knee", "Ankle", "Post-Op"] as const;

function CommunityFilterBar({
  selectedArea,
  showExpertOnly,
  sortLabel,
  onFilterChange,
}: {
  selectedArea: string;
  showExpertOnly: boolean;
  sortLabel: string;
  onFilterChange: (next: { area?: string; expertOnly?: boolean }) => void;
}) {
  return (
    <div className="sticky top-[52px] z-10 border-b border-zinc-100 bg-white/80 px-5 py-4 backdrop-blur-md">
      <div className="flex flex-col gap-4">
        <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
          {BODY_PARTS.map((part) => {
            const active = selectedArea === part;
            return (
              <button
                key={part}
                onClick={() => onFilterChange({ area: part })}
                className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-zinc-200 text-zinc-600 hover:bg-indigo-600 hover:text-white"
                }`}
              >
                #{part}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">{sortLabel}</span>
          <label className="flex cursor-pointer items-center gap-2">
            <span className="text-xs font-bold text-indigo-600">전문가 리포트만 보기</span>
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
              checked={showExpertOnly}
              onChange={(e) => onFilterChange({ expertOnly: e.target.checked })}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function getPostAuthorId(post: CommunityPost): string | null {
  const p = post as unknown as { user_id?: unknown; author_id?: unknown };
  if (typeof p.user_id === "string" && p.user_id.trim()) return p.user_id;
  if (typeof p.author_id === "string" && p.author_id.trim()) return p.author_id;
  return null;
}

function previewText(content: CommunityPost["content"]): string {
  const pickFromObject = (obj: Record<string, unknown>): string => {
    const chunk =
      obj.body ??
      obj.text ??
      obj.assessment ??
      obj.anonymized_subjective ??
      obj.subjective ??
      obj.objective ??
      obj.plan;
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
  const report = (post as CommunityPost & {
    report?: {
      evaluation_area?: string | null;
      diagnosis_area?: string | null;
      overall_score?: number | null;
      clinical_reasoning?: string | null;
      created_at?: string | null;
    } | null;
  }).report;
  const author = (post as CommunityPost & {
    author?: {
      full_name?: string | null;
      avatar_url?: string | null;
      years_of_experience?: number | null;
      is_expert_verified?: boolean | null;
    } | null;
  }).author;

  const mainBlock = (
    <>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-transparent to-zinc-50/30 opacity-0 transition group-hover:opacity-100" aria-hidden />

      <div className="relative px-4 pb-3 pt-4 transition group-hover:bg-zinc-50/30 sm:px-5 sm:pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-lg shadow-inner ring-2 ring-white/60"
              aria-hidden
            >
              <span className="drop-shadow-sm">👤</span>
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-bold text-slate-900">
                    {author?.full_name || d.cardAuthor}
                  </span>

                  {typeof author?.years_of_experience === "number" && author.years_of_experience >= 10 ? (
                    <div className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 shadow-sm">
                      <span className="text-[9px] font-black uppercase tracking-tighter text-amber-700">10Y+ Master</span>
                      <div className="h-1 w-1 animate-pulse rounded-full bg-amber-400" />
                    </div>
                  ) : author?.is_expert_verified ? (
                    <div className="flex items-center gap-1 rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5">
                      <span className="text-[10px] font-black uppercase italic text-indigo-600">Expert</span>
                    </div>
                  ) : null}

                  <span className="text-[10px] text-zinc-400">
                    {typeof author?.years_of_experience === "number" ? `${author.years_of_experience}년차` : "경력 비공개"}
                  </span>
                </div>
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
                {report ? (
                  <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 transition-all hover:bg-indigo-50">
                    <div className="mb-2 flex items-center justify-between border-b border-indigo-100/50 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Clinical Summary</span>
                      </div>
                      <span className="text-[9px] font-medium text-slate-400">
                        {report.created_at ? new Date(report.created_at).toLocaleDateString() : "—"}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-black text-slate-900">
                          {report.evaluation_area || report.diagnosis_area || "General"} Assessment
                        </h4>
                        <p className="mt-1 overflow-hidden text-xs italic leading-relaxed text-slate-600 line-clamp-2">
                          "{report.clinical_reasoning || "—"}"
                        </p>
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <div className="inline-flex flex-col items-center justify-center rounded-lg border border-indigo-50 bg-white px-2.5 py-1.5 shadow-sm">
                          <span className="text-xl font-black leading-none text-indigo-600">{report.overall_score ?? "—"}</span>
                          <span className="mt-0.5 text-[8px] font-bold uppercase text-indigo-300">SCORE</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
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
          <PostMenu postId={post.id} isOwner={canDelete} />
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
            <span className="truncate">댓글</span>
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
              {d.commentDelete}
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
  const isEnglish = lang === "en";
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
  const [draftText, setDraftText] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string>("All");
  const [showExpertOnly, setShowExpertOnly] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadPrivacyConsent, setUploadPrivacyConsent] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

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

  const fetchPosts = useCallback(async () => {
    const params = new URLSearchParams({
      sort,
      page: "1",
      selectedArea,
      showExpertOnly: String(showExpertOnly),
    });
    const res = await fetch(`/api/community/feed?${params.toString()}`);
    const data = (await res.json()) as {
      success?: boolean;
      posts?: CommunityPost[];
      hasMore?: boolean;
    };
    if (!data.success || !Array.isArray(data.posts)) return;
    setPosts(data.posts);
    const more = Boolean(data.hasMore);
    setHasMore(more);
    hasMoreRef.current = more;
    pageRef.current = 2;
  }, [selectedArea, showExpertOnly, sort]);

  const appendNext = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current || !initialReadyRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const p = pageRef.current;
      const params = new URLSearchParams({
        sort,
        page: String(p),
        selectedArea,
        showExpertOnly: String(showExpertOnly),
      });
      const res = await fetch(`/api/community/feed?${params.toString()}`);
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
  }, [selectedArea, showExpertOnly, sort]);

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
        const params = new URLSearchParams({
          sort,
          page: "1",
          selectedArea,
          showExpertOnly: String(showExpertOnly),
        });
        const res = await fetch(`/api/community/feed?${params.toString()}`);
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
  }, [selectedArea, showExpertOnly, sort]);

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

  const handleCreatePost = useCallback(async () => {
    if (!draftText.trim() && !selectedReport) return;
    if (uploadedImageUrl && !uploadPrivacyConsent) {
      alert(getPhotoUploadGuidelineConsentMessage(isEnglish ? "en" : "ko"));
      return;
    }

    setIsPosting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Login required");
        return;
      }

      const res = await fetch("/api/community/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: draftText.trim() || (selectedReport ? "공유된 임상 리포트입니다." : ""),
          authorId: user.id,
          reportId: selectedReport?.id || null,
          category: selectedReport?.evaluation_area || selectedReport?.diagnosis_area || "General",
          mediaUrls: uploadedImageUrl ? [uploadedImageUrl] : [],
          imageUrl: uploadedImageUrl,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        success?: boolean;
        error?: string;
      };
      if (!res.ok || (!data.ok && !data.success)) {
        throw new Error(data.error || "Save failed");
      }
      setDraftText("");
      setSelectedReport(null);
      setUploadedImageUrl(null);
      setUploadPrivacyConsent(false);
      if (typeof fetchPosts === "function") {
        await fetchPosts();
      }
    } catch (error) {
      console.error(error);
      alert("Save failed: " + (error as Error).message);
    } finally {
      setIsPosting(false);
    }
  }, [draftText, fetchPosts, isEnglish, selectedReport?.diagnosis_area, selectedReport?.evaluation_area, selectedReport?.id, supabase, uploadPrivacyConsent, uploadedImageUrl]);

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      if (!uploadPrivacyConsent) {
        alert(getPhotoUploadGuidelineConsentMessage(isEnglish ? "en" : "ko"));
        e.target.value = "";
        return;
      }

      setUploading(true);
      const file = e.target.files[0];
      const url = await uploadMedia(file, "clinical_cases");

      if (url) {
        setUploadedImageUrl(url);
        alert("이미지가 업로드되었습니다!");
      }
      setUploading(false);
    },
    [isEnglish, uploadPrivacyConsent],
  );

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

      <CommunityFilterBar
        selectedArea={selectedArea}
        showExpertOnly={showExpertOnly}
        sortLabel={`정렬: ${sort === "latest" ? "최신순" : "인기순"}`}
        onFilterChange={({ area, expertOnly }) => {
          if (typeof area === "string") setSelectedArea(area);
          if (typeof expertOnly === "boolean") setShowExpertOnly(expertOnly);
        }}
      />

      <section className="border-b border-zinc-200/80 bg-white/80 px-3 py-3 sm:px-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder={d.composePlaceholder}
            className="min-h-[88px] w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
          <PhotoUploadGuideline
            className="mt-4"
            consent={uploadPrivacyConsent}
            onConsentChange={setUploadPrivacyConsent}
            locale={isEnglish ? "en" : "ko"}
          />
          <div className="mt-2">
            <label className="mb-2 block text-sm font-bold text-slate-700">📸 임상 사진 첨부</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
              className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {uploading ? <p className="mt-2 animate-pulse text-xs text-indigo-500">업로드 중...</p> : null}
            {uploadedImageUrl ? <p className="mt-1 truncate text-[11px] text-slate-500">업로드 완료: {uploadedImageUrl}</p> : null}
          </div>
          <div className="mt-3 flex items-center justify-between border-t pt-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  selectedReport
                    ? "border border-emerald-200 bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <FileText size={14} />
                {selectedReport ? (isEnglish ? "Report Attached" : "리포트 첨부됨") : (isEnglish ? "Attach Report" : "리포트 첨부")}
              </button>
            </div>

            <button
              type="button"
              onClick={() => void handleCreatePost()}
              disabled={isPosting || (!draftText.trim() && !selectedReport)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPosting ? d.posting : d.postAction}
            </button>
          </div>

          {selectedReport && (
            <div className="mt-2 flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
              <span className="flex items-center gap-2 font-medium">
                <Check size={14} /> [{selectedReport.evaluation_area || selectedReport.diagnosis_area}]{" "}
                {isEnglish ? "Report will be shared." : "리포트가 공유됩니다."}
              </span>
              <button onClick={() => setSelectedReport(null)} className="text-indigo-400 hover:text-indigo-600">
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </section>

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
                canDelete={currentUserId != null && getPostAuthorId(post) === currentUserId}
                deleting={deletingPostId === post.id}
                onDelete={() => {
                  if (!window.confirm(d.deleteConfirm)) return;
                  setDeletingPostId(post.id);
                  void (async () => {
                    try {
                      const res = await fetch(`/api/community/post?id=${post.id}`, {
                        method: "DELETE",
                      });
                      if (res.ok) {
                        alert(d.deleteDone);
                        await fetchPosts();
                        return;
                      }
                      const data = (await res.json()) as { error?: string };
                      if (!res.ok) {
                        alert(d.deleteFailedPrefix + (data.error ?? d.unknownError));
                        return;
                      }
                    } catch (error) {
                      console.error(d.deleteErrorLog, error);
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

      <ReportSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={(report) => setSelectedReport(report)}
      />
    </div>
  );
}
