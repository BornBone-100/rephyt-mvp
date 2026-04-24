"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import NeuroExamTabs from "./NeuroExamTabs";

type Locale = "ko" | "en";
type NeuroStatusValue = "정상" | "저하" | "소실";

type NeuroSyndromeOption = {
  key: string;
  ko: string;
  en: string;
  descriptionKo: string;
  descriptionEn: string;
  recommendedTests: string[];
};

type NeuroSyndromeGroup = {
  groupKo: string;
  groupEn: string;
  options: NeuroSyndromeOption[];
};

type DtrRow = { key: string; labelKo: string; labelEn: string };

type Props = {
  locale: Locale;
  syndromeMap: Record<"upper" | "lower", NeuroSyndromeGroup[]>;
  selectedSyndromes: string[];
  onToggleSyndrome: (key: string) => void;
  onClearSyndromes: () => void;
  evaluationNeuroExamTable: {
    myotome: Record<string, { L: NeuroStatusValue; R: NeuroStatusValue }>;
    dermatome: Record<string, { L: NeuroStatusValue; R: NeuroStatusValue }>;
    dtr: Record<string, { L: NeuroStatusValue; R: NeuroStatusValue }>;
  };
  onPatchEvaluationNeuroExam: (
    section: "myotome" | "dermatome" | "dtr",
    rowKey: string,
    side: "L" | "R",
    value: NeuroStatusValue,
  ) => void;
  myotomeLevels: readonly string[];
  dtrRows: readonly DtrRow[];
};

const TAB_BASE =
  "border-b-2 px-3 py-2 text-xs font-black transition-colors";
const ACTIVE_TAB = "border-indigo-600 text-indigo-600";
const INACTIVE_TAB = "border-transparent text-slate-400 hover:text-slate-600";

export default function NeuroEntrapmentSelector({
  locale,
  syndromeMap,
  selectedSyndromes,
  onToggleSyndrome,
  onClearSyndromes,
  evaluationNeuroExamTable,
  onPatchEvaluationNeuroExam,
  myotomeLevels,
  dtrRows,
}: Props) {
  const [regionTab, setRegionTab] = useState<"upper" | "lower">("upper");
  const [openedTooltipKey, setOpenedTooltipKey] = useState<string | null>(null);
  const hasSelection = selectedSyndromes.length > 0;
  const firstSelected = selectedSyndromes[0];
  const firstLabel = (() => {
    for (const groups of Object.values(syndromeMap)) {
      for (const group of groups) {
        const found = group.options.find((opt) => opt.key === firstSelected);
        if (found) return locale === "en" ? found.en : found.ko;
      }
    }
    return "";
  })();

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
      <div className="mb-2">
        <p className="text-xs font-bold uppercase text-indigo-800">
          {locale === "en"
            ? "Nerve Entrapment Diagnosis"
            : "신경 포착 감별 진단 (Nerve Entrapment Diagnosis)"}
        </p>
      </div>

      <div className="space-y-3 pt-2">
        <div className="rounded-xl border border-indigo-100 bg-white/80 p-3">
          <div className="mb-2 flex items-center gap-2 border-b border-slate-200">
            {(
              [
                ["upper", locale === "en" ? "Upper" : "상지 (Upper)"],
                ["lower", locale === "en" ? "Lower" : "하지 (Lower)"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setRegionTab(k)}
                className={`${TAB_BASE} ${regionTab === k ? ACTIVE_TAB : INACTIVE_TAB}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {syndromeMap[regionTab].map((group) => (
              <div key={`${regionTab}-${group.groupEn}`} className="rounded-md border border-slate-100 bg-slate-50 p-2">
                <p className="mb-1 text-[11px] font-bold text-slate-600">
                  {locale === "en" ? group.groupEn : group.groupKo}
                </p>
                <div className="grid grid-cols-1 gap-1.5 lg:grid-cols-2">
                  {group.options.map((opt) => {
                    const active = selectedSyndromes.includes(opt.key);
                    return (
                      <div
                        key={opt.key}
                        className={`relative flex items-start justify-between gap-2 rounded-lg border px-2.5 py-2 ${
                          active
                            ? "border-indigo-300 bg-indigo-100"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onToggleSyndrome(opt.key)}
                          className={`min-w-0 flex-1 whitespace-normal break-words text-left text-sm font-bold leading-snug transition ${
                            active ? "text-indigo-800" : "text-slate-600 hover:text-indigo-700"
                          }`}
                        >
                          {locale === "en" ? opt.en : opt.ko}
                        </button>
                        <button
                          type="button"
                          aria-label={locale === "en" ? "View clinical hint" : "임상 설명 보기"}
                          onMouseEnter={() => setOpenedTooltipKey(opt.key)}
                          onMouseLeave={() => setOpenedTooltipKey((prev) => (prev === opt.key ? null : prev))}
                          onFocus={() => setOpenedTooltipKey(opt.key)}
                          onBlur={() => setOpenedTooltipKey((prev) => (prev === opt.key ? null : prev))}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenedTooltipKey((prev) => (prev === opt.key ? null : opt.key));
                          }}
                          className="relative rounded p-0.5 text-slate-400 transition hover:text-indigo-600"
                        >
                          <Info className="h-[15px] w-[15px]" />
                          {openedTooltipKey === opt.key ? (
                            <span className="pointer-events-none absolute right-0 top-full z-30 mt-1 w-64 rounded-md bg-slate-800 px-2 py-1.5 text-left text-[10px] font-medium leading-relaxed text-white shadow-xl">
                              {locale === "en" ? opt.descriptionEn : opt.descriptionKo}
                            </span>
                          ) : null}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-bold ${
            hasSelection
              ? "bg-indigo-600 text-white"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          <span>
            {hasSelection
              ? locale === "en"
                ? `Current hypothesis: ${firstLabel} suspected`
                : `현재 가설: ${firstLabel} 의심`
              : locale === "en"
                ? "No selected neurological hypothesis (simple musculoskeletal pattern)"
                : "선택된 신경학적 가설 없음 (단순 근골격계)"}
          </span>
          <button
            type="button"
            onClick={onClearSyndromes}
            className={`rounded border px-2 py-1 text-[10px] ${
              hasSelection
                ? "border-white/50 bg-white/10 text-white hover:bg-white/20"
                : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            {locale === "en" ? "Clear" : "초기화"}
          </button>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ${
            hasSelection ? "max-h-[900px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="rounded-xl border border-indigo-100 bg-white/80 p-3">
            <p className="mb-2 text-[11px] font-bold uppercase text-indigo-700">
              Neuro Exam: Myotome / Dermatome / DTR
            </p>
            <NeuroExamTabs
              locale={locale}
              value={evaluationNeuroExamTable}
              myotomeLevels={myotomeLevels}
              dtrRows={dtrRows}
              onChange={onPatchEvaluationNeuroExam}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

