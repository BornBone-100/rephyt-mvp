"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { getDictionary } from "@/dictionaries/getDictionary";
import { getCommentDisplayForLocale, type CommunityComment } from "./comment-display";

type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

type Props = {
  postId: string;
  locale: string;
  dict: Dictionary;
  initialComments: CommunityComment[];
  currentUserId: string | null;
};

export function CommunityCommentsSection({ postId, locale, dict, initialComments, currentUserId }: Props) {
  const d = dict.dashboard.community;
  const router = useRouter();
  const [comments, setComments] = useState<CommunityComment[]>(initialComments);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  const handleSubmit = useCallback(async () => {
    const content = draft.trim();
    if (!content) {
      setError(d.commentEmptyError);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/community/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          content,
          authorLang: locale,
        }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || !data.success) {
        setError(data.message ?? d.commentSendError);
        return;
      }
      setDraft("");
      router.refresh();
    } catch {
      setError(d.commentSendError);
    } finally {
      setSubmitting(false);
    }
  }, [draft, postId, locale, router, d.commentEmptyError, d.commentSendError]);

  const title = `${d.clinicalAdvisory} (${comments.length})`;

  return (
    <div className="mt-10 space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-bold tracking-tight text-zinc-900">{title}</h3>

        {comments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-500">
            {d.postDetailNoComments}
          </p>
        ) : (
          <ul className="space-y-3">
            {comments.map((comment) => {
              const { text, showTranslatedBadge } = getCommentDisplayForLocale(locale, comment);
              const isOwnComment = currentUserId != null && comment.author_id === currentUserId;
              const isDeleting = deletingCommentId === comment.id;
              return (
                <li
                  key={comment.id}
                  className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 text-xs font-bold text-zinc-600">
                      {d.postDetailPtAvatar}
                    </div>
                    <span className="text-sm font-semibold text-zinc-700">{d.postDetailAnonymousTherapist}</span>
                    {showTranslatedBadge ? (
                      <span className="ml-auto rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-600">
                        {d.postDetailAiTranslatedBadge}
                      </span>
                    ) : null}
                    {isOwnComment ? (
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={async () => {
                          if (!window.confirm(d.commentDeleteConfirm)) return;
                          setDeletingCommentId(comment.id);
                          try {
                            const res = await fetch("/api/community/comment", {
                              method: "DELETE",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ commentId: comment.id }),
                            });
                            const data = (await res.json()) as { success?: boolean; message?: string };
                            if (!res.ok || !data.success) {
                              setError(data.message ?? d.commentSendError);
                              return;
                            }
                            setComments((prev) => prev.filter((c) => c.id !== comment.id));
                          } catch {
                            setError(d.commentSendError);
                          } finally {
                            setDeletingCommentId(null);
                          }
                        }}
                        className="ml-auto text-xs font-medium text-zinc-400 transition hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {d.commentDelete}
                      </button>
                    ) : null}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">{text}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-3xl border border-zinc-200/90 bg-white p-4 shadow-sm sm:p-5">
        <label htmlFor="community-comment" className="mb-2 block text-sm font-semibold text-zinc-800">
          {d.clinicalAdvisory}
        </label>
        <textarea
          id="community-comment"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          rows={4}
          disabled={submitting}
          placeholder={d.clinicalAdvisoryCommentPlaceholder}
          className="w-full resize-y rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
        />
        {error ? (
          <p className="mt-2 text-sm font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:from-indigo-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? d.commentSubmitting : d.commentSubmit}
          </button>
        </div>
      </div>
    </div>
  );
}

