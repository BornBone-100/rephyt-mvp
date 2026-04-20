import type { Tables } from "@/types/supabase";

export type CommunityComment = Tables<"community_comments">;

/** URL `lang`과 `author_lang`이 같으면 원문, 다르면 번역본 + 뱃지 */
export function getCommentDisplayForLocale(
  currentLang: string,
  comment: CommunityComment,
): { text: string; showTranslatedBadge: boolean } {
  const cur = currentLang.toLowerCase();
  const raw = comment.author_lang;
  const authorNorm =
    raw != null && String(raw).trim() !== "" ? String(raw).toLowerCase().trim() : null;
  const authorForCompare = authorNorm ?? "ko";
  const same = authorForCompare === cur;
  return {
    text: same ? comment.original_content : comment.translated_content,
    showTranslatedBadge: !same,
  };
}
