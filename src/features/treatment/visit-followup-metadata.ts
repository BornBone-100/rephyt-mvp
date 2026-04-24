import type { Json } from "@/types/supabase-generated";

/** 이전 대비 임상 상태 변화 */
export type VisitFollowupChangeLog = "improved" | "unchanged" | "worsened" | "";

export type TreatmentVisitMetadata = {
  special_notes: string;
  is_flagged: boolean;
  change_log: VisitFollowupChangeLog;
  /** 저장 시각(ISO). 행의 created_at과 동일 시각으로 기록해 히스토리 추적에 사용 */
  created_at: string;
};

export const VISIT_FOLLOWUP_QUICK_TAGS_KO = [
  "치료 후 통증 감소",
  "운동 이행도 낮음",
  "다음 내원 전 증상 악화 시 연락",
  "자세 교정 이해도 양호",
  "야간통 호전",
  "일상 활동 제한 지속",
] as const;

export const VISIT_FOLLOWUP_QUICK_TAGS_EN = [
  "Post-treatment pain reduced",
  "Low HEP adherence",
  "Contact clinic if symptoms worsen before next visit",
  "Good understanding of posture cues",
  "Night pain improved",
  "Ongoing ADL limitations",
] as const;

export function buildTreatmentVisitMetadata(input: {
  special_notes: string;
  is_flagged: boolean;
  change_log: VisitFollowupChangeLog;
  createdAt?: string;
}): Json {
  const created_at = input.createdAt ?? new Date().toISOString();
  return {
    special_notes: String(input.special_notes ?? "").slice(0, 8000),
    is_flagged: Boolean(input.is_flagged),
    change_log: normalizeChangeLog(input.change_log),
    created_at,
  };
}

export function normalizeChangeLog(v: unknown): VisitFollowupChangeLog {
  if (v === "improved" || v === "unchanged" || v === "worsened") return v;
  return "";
}

export function parseTreatmentVisitMetadata(raw: unknown): TreatmentVisitMetadata | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const special_notes = typeof o.special_notes === "string" ? o.special_notes : "";
  const is_flagged = o.is_flagged === true;
  const change_log = normalizeChangeLog(o.change_log);
  const created_at = typeof o.created_at === "string" ? o.created_at : "";
  if (!special_notes.trim() && !is_flagged && !change_log) return null;
  return {
    special_notes,
    is_flagged,
    change_log,
    created_at: created_at || new Date().toISOString(),
  };
}

export type FlaggedVisitMemo = TreatmentVisitMetadata & {
  treatment_id: string;
  row_created_at: string;
};

/** 가장 최근 is_flagged === true 인 처치 로그 메타데이터 */
export function findLatestFlaggedVisitMemo(
  rows: ReadonlyArray<{ id: string; created_at: string; metadata: unknown }>,
): FlaggedVisitMemo | null {
  const sorted = [...rows].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  for (const row of sorted) {
    const meta = parseTreatmentVisitMetadata(row.metadata);
    if (meta?.is_flagged === true) {
      return {
        ...meta,
        treatment_id: row.id,
        row_created_at: row.created_at,
      };
    }
  }
  return null;
}

export function changeLogLabelKo(v: VisitFollowupChangeLog): string {
  if (v === "improved") return "호전";
  if (v === "unchanged") return "유지";
  if (v === "worsened") return "악화";
  return "미선택";
}

export function changeLogLabelEn(v: VisitFollowupChangeLog): string {
  if (v === "improved") return "Improved";
  if (v === "unchanged") return "Unchanged";
  if (v === "worsened") return "Worsened";
  return "Not selected";
}

/** 본문(content)에 사람이 읽기 쉬운 한 줄 요약 */
export function formatVisitFollowupContentBlock(
  specialNotes: string,
  changeLog: VisitFollowupChangeLog,
  locale: "en" | "ko",
): string {
  const lines: string[] = ["[특이사항·다음 내원]"];
  if (changeLog) {
    lines.push(
      locale === "en"
        ? `Change vs prior: ${changeLogLabelEn(changeLog)}`
        : `이전 대비: ${changeLogLabelKo(changeLog)}`,
    );
  }
  const notes = specialNotes.trim();
  if (notes) lines.push(locale === "en" ? `Notes: ${notes}` : `메모: ${notes}`);
  return lines.join("\n");
}

export function appendQuickTagToNotes(current: string, tag: string): string {
  const t = tag.trim();
  if (!t) return current;
  const base = current.trim();
  if (!base) return t;
  if (base.includes(t)) return base;
  return `${base} · ${t}`;
}
