"use client";

import type { VisitFollowupChangeLog } from "@/features/treatment/visit-followup-metadata";
import {
  VISIT_FOLLOWUP_QUICK_TAGS_EN,
  VISIT_FOLLOWUP_QUICK_TAGS_KO,
  appendQuickTagToNotes,
  changeLogLabelEn,
  changeLogLabelKo,
} from "@/features/treatment/visit-followup-metadata";

type Props = {
  locale: "en" | "ko";
  specialNotes: string;
  isFlagged: boolean;
  changeLog: VisitFollowupChangeLog;
  onSpecialNotes: (v: string) => void;
  onFlagged: (v: boolean) => void;
  onChangeLog: (v: VisitFollowupChangeLog) => void;
  /** 주황(환자 차트) / 로즈(SOAP) 등 */
  accent?: "orange" | "rose";
};

const CHANGE_OPTIONS: { value: VisitFollowupChangeLog; ko: string; en: string }[] = [
  { value: "", ko: "선택", en: "Select…" },
  { value: "improved", ko: "호전", en: "Improved" },
  { value: "unchanged", ko: "유지", en: "Unchanged" },
  { value: "worsened", ko: "악화", en: "Worsened" },
];

export function VisitFollowupPanel({
  locale,
  specialNotes,
  isFlagged,
  changeLog,
  onSpecialNotes,
  onFlagged,
  onChangeLog,
  accent = "orange",
}: Props) {
  const isEn = locale === "en";
  const tags = isEn ? VISIT_FOLLOWUP_QUICK_TAGS_EN : VISIT_FOLLOWUP_QUICK_TAGS_KO;
  const focus =
    accent === "rose"
      ? "focus:border-rose-400 focus:ring-rose-100"
      : "focus:border-orange-400 focus:ring-orange-100";
  const borderAccent = accent === "rose" ? "border-rose-200 bg-rose-50/40" : "border-amber-200 bg-amber-50/50";
  const titleClass = accent === "rose" ? "text-rose-800" : "text-amber-900";
  const pillOn = accent === "rose" ? "bg-rose-600" : "bg-amber-600";
  const pillOff = accent === "rose" ? "bg-slate-200" : "bg-slate-200";

  return (
    <div className={`rounded-2xl border-2 ${borderAccent} p-4 shadow-inner`}>
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className={`text-sm font-black ${titleClass}`}>
          {isEn ? "Special notes & next visit" : "특이사항 및 다음 내원 체크"}
        </h3>
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {isEn ? "Saved in treatment log metadata" : "처치 로그 metadata(JSON)에 저장"}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <span className="w-full text-[10px] font-bold text-slate-600 sm:w-auto">
          {isEn ? "Quick tags" : "Quick Tag"}
        </span>
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onSpecialNotes(appendQuickTagToNotes(specialNotes, tag))}
            className={`rounded-full border border-white/80 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm transition hover:brightness-95 ${
              accent === "rose" ? "hover:border-rose-200" : "hover:border-amber-200"
            }`}
          >
            + {tag}
          </button>
        ))}
      </div>

      <label className="mb-1 block text-xs font-bold text-slate-600">
        {isEn ? "Free text (special_notes)" : "자유 메모 (special_notes)"}
      </label>
      <textarea
        value={specialNotes}
        onChange={(e) => onSpecialNotes(e.target.value)}
        rows={3}
        className={`mb-4 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none transition focus:ring-2 ${focus}`}
        placeholder={
          isEn
            ? "Key points for the next session, precautions, adherence, etc."
            : "다음 내원 시 확인할 점, 주의사항, 이행도 등을 간단히 적어 주세요."
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-bold text-slate-600">
            {isEn ? "Change vs prior visit (change_log)" : "이전 대비 상태 (change_log)"}
          </p>
          <select
            value={changeLog}
            onChange={(e) => onChangeLog(e.target.value as VisitFollowupChangeLog)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none"
          >
            {CHANGE_OPTIONS.map((o) => (
              <option key={o.value || "none"} value={o.value}>
                {isEn ? o.en : o.ko}
              </option>
            ))}
          </select>
          {changeLog ? (
            <p className="mt-1 text-[11px] text-slate-500">
              {isEn ? changeLogLabelEn(changeLog) : changeLogLabelKo(changeLog)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col justify-end">
          <p className="mb-2 text-xs font-bold text-slate-600">
            {isEn ? "Highlight on next open (is_flagged)" : "다음 방문 시 상단 강조 (is_flagged)"}
          </p>
          <button
            type="button"
            role="switch"
            aria-checked={isFlagged}
            onClick={() => onFlagged(!isFlagged)}
            className={`flex h-11 items-center justify-between rounded-xl px-4 text-sm font-black text-white transition ${
              isFlagged ? pillOn : pillOff
            }`}
          >
            <span>{isEn ? (isFlagged ? "Flagged for dashboard" : "Off") : isFlagged ? "강조 켜짐" : "강조 끔"}</span>
            <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs">{isFlagged ? "ON" : "OFF"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
