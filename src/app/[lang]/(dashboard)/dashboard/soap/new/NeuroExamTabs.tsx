"use client";

import { useMemo, useState } from "react";

type Locale = "ko" | "en";
type Side = "L" | "R";
type NeuroStatusValue = "정상" | "저하" | "소실";

type NeuroExamStatusTable = {
  myotome: Record<string, { L: NeuroStatusValue; R: NeuroStatusValue }>;
  dermatome: Record<string, { L: NeuroStatusValue; R: NeuroStatusValue }>;
  dtr: Record<string, { L: NeuroStatusValue; R: NeuroStatusValue }>;
};

type DtrRow = { key: string; labelKo: string; labelEn: string };

type Props = {
  locale: Locale;
  value: NeuroExamStatusTable;
  myotomeLevels: readonly string[];
  dtrRows: readonly DtrRow[];
  onChange: (
    section: "myotome" | "dermatome" | "dtr",
    rowKey: string,
    side: Side,
    next: NeuroStatusValue,
  ) => void;
};

const TAB_BASE =
  "border-b-2 px-3 py-2 text-xs font-black transition-colors";
const ACTIVE_TAB = "border-indigo-600 text-indigo-600";
const INACTIVE_TAB = "border-transparent text-slate-400 hover:text-slate-600";

const STATUS_OPTIONS: NeuroStatusValue[] = ["정상", "저하", "소실"];

function statusLabel(locale: Locale, v: NeuroStatusValue) {
  if (locale === "en") {
    if (v === "정상") return "Normal";
    if (v === "저하") return "Reduced";
    return "Absent";
  }
  return v;
}

export default function NeuroExamTabs({
  locale,
  value,
  myotomeLevels,
  dtrRows,
  onChange,
}: Props) {
  const [tab, setTab] = useState<"myotome" | "dermatome" | "dtr">("myotome");

  const rows = useMemo(() => {
    if (tab === "myotome") return myotomeLevels.map((lv) => ({ key: lv, label: lv }));
    if (tab === "dermatome") return myotomeLevels.map((lv) => ({ key: lv, label: lv }));
    return dtrRows.map((r) => ({ key: r.key, label: locale === "en" ? r.labelEn : r.labelKo }));
  }, [dtrRows, locale, myotomeLevels, tab]);

  return (
    <div className="rounded-xl border border-indigo-100 bg-white p-3">
      <div className="mb-2 flex items-center gap-2 border-b border-slate-200">
        {(
          [
            ["myotome", "Myotome"],
            ["dermatome", "Dermatome"],
            ["dtr", "DTR"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`${TAB_BASE} ${tab === k ? ACTIVE_TAB : INACTIVE_TAB}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={`${tab}-${row.key}`}
            className="grid grid-cols-[110px_1fr_1fr] items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-2"
          >
            <p className="text-[11px] font-bold text-slate-700">{row.label}</p>
            {(["L", "R"] as const).map((side) => (
              <div key={`${row.key}-${side}`} className="rounded-md border border-slate-200 bg-white p-1">
                <p className="mb-1 text-[10px] font-bold text-slate-400">{side}</p>
                <div className="grid grid-cols-3 gap-1">
                  {STATUS_OPTIONS.map((opt) => {
                    const active = value[tab][row.key]?.[side] === opt;
                    return (
                      <button
                        key={`${row.key}-${side}-${opt}`}
                        type="button"
                        onClick={() => onChange(tab, row.key, side, opt)}
                        className={`rounded px-1 py-1 text-[10px] font-bold transition ${
                          active
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"
                        }`}
                      >
                        {statusLabel(locale, opt)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

