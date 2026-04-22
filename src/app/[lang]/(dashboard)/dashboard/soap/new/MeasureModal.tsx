"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X, ClipboardCheck } from "lucide-react";
import {
  getOutcomeMeasuresBundle,
  getModalRegionForOutcomeId,
  resolveOutcomeMeasureRegion,
  type MeasureLocale,
  type MeasureQuestion5,
  type MeasureQuestion6,
  type MeasureQuestionWomac,
  type OutcomeMeasureRegion,
} from "@/constants/measures";
import { soapWizardCopy, type SoapLocale } from "./soap-copy";

export type Step2OutcomePayload = {
  functionalScore: number;
  functionalComment: string;
  measureKey: OutcomeMeasureRegion | "custom";
  measureName: string;
  outcomeId?: string;
};

type MeasureModalProps = {
  open: boolean;
  onClose: () => void;
  diagnosisArea: string;
  activeOutcomeId?: string | null;
  onApply: (payload: Step2OutcomePayload) => void;
  locale?: SoapLocale;
};

function formatComment(
  locale: MeasureLocale,
  measureName: string,
  percent: number,
  label: string,
): string {
  const pct = Math.round(percent * 10) / 10;
  if (locale === "en") {
    return `${measureName}: ${pct}% total disability — ${label}.`;
  }
  return `${measureName} 평가 결과 ${pct}%로 ${label} 소견 보임.`;
}

function isQuickDashCalcError(label: string): boolean {
  return (
    label.includes("불일치") ||
    label.includes("허용") ||
    label.includes("mismatch") ||
    label.includes("must be scored")
  );
}

export function MeasureModal({
  open,
  onClose,
  diagnosisArea,
  activeOutcomeId,
  onApply,
  locale = "ko",
}: MeasureModalProps) {
  const ml = locale === "en" ? "en" : "ko";
  const ui = soapWizardCopy(locale);
  const measures = useMemo(() => getOutcomeMeasuresBundle(ml), [ml]);

  const region = useMemo(() => {
    if (activeOutcomeId && activeOutcomeId !== "manual") {
      const mapped = getModalRegionForOutcomeId(activeOutcomeId);
      if (mapped) return mapped;
      return null;
    }
    return resolveOutcomeMeasureRegion(diagnosisArea);
  }, [activeOutcomeId, diagnosisArea]);

  const meta = region ? measures[region] : null;

  const [answers, setAnswers] = useState<Record<number, number>>({});

  useEffect(() => {
    if (open) setAnswers({});
  }, [open, region]);

  const setAnswer = useCallback((id: number, value: number) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }, []);

  const preview = useMemo(() => {
    if (!region) return null;

    if (region === "neck") {
      const qs = measures.neck.questions;
      const vals = qs.map((q) => answers[q.id]);
      if (vals.some((v) => v === undefined)) {
        const done = vals.filter((v) => v !== undefined).length;
        return {
          kind: "partial" as const,
          done,
          total: qs.length,
          text: `${ui.modalProgress}: ${done}/${qs.length} ${ui.modalItems}`,
        };
      }
      const sum = vals.reduce((a, b) => a + b, 0);
      const calc = measures.neck.calc(sum);
      const u = ui.scorePts;
      return {
        kind: "full" as const,
        display: `${calc.raw} ${u} (${Math.round(calc.percent * 10) / 10}%, ${calc.label})`,
        percent: calc.percent,
        label: calc.label,
        rawLabel: `${calc.raw}/${calc.max} ${u}`,
      };
    }

    if (region === "lumbar") {
      const qs = measures.lumbar.questions;
      const vals = qs.map((q) => answers[q.id]);
      if (vals.some((v) => v === undefined)) {
        const done = vals.filter((v) => v !== undefined).length;
        return {
          kind: "partial" as const,
          done,
          total: qs.length,
          text: `${ui.modalProgress}: ${done}/${qs.length} ${ui.modalItems}`,
        };
      }
      const sum = vals.reduce((a, b) => a + b, 0);
      const calc = measures.lumbar.calc(sum);
      const u = ui.scorePts;
      return {
        kind: "full" as const,
        display: `${calc.raw} ${u} (${Math.round(calc.percent * 10) / 10}%, ${calc.label})`,
        percent: calc.percent,
        label: calc.label,
        rawLabel: `${calc.raw}/${calc.max} ${u}`,
      };
    }

    if (region === "shoulder") {
      const qs = measures.shoulder.questions;
      const vals = qs.map((q) => answers[q.id]);
      if (vals.some((v) => v === undefined)) {
        const done = vals.filter((v) => v !== undefined).length;
        return {
          kind: "partial" as const,
          done,
          total: qs.length,
          text: `${ui.modalProgress}: ${done}/${qs.length} ${ui.modalItems}`,
        };
      }
      const r = measures.shoulder.calc(vals as number[]);
      if (isQuickDashCalcError(r.label)) {
        return { kind: "error" as const, text: r.label };
      }
      return {
        kind: "full" as const,
        display: `QuickDASH ${Math.round(r.dashScore * 10) / 10} (${Math.round(r.percent * 10) / 10}%, ${r.label})`,
        percent: r.percent,
        label: r.label,
        rawLabel: `DASH ${Math.round(r.dashScore * 10) / 10}`,
      };
    }

    if (region === "knee") {
      const pain = measures.knee.sections.pain.map((q) => answers[q.id]);
      const stiffness = measures.knee.sections.stiffness.map((q) => answers[q.id]);
      const func = measures.knee.sections.function.map((q) => answers[q.id]);
      const all = [...pain, ...stiffness, ...func];
      if (all.some((v) => v === undefined)) {
        const done = all.filter((v) => v !== undefined).length;
        return {
          kind: "partial" as const,
          done,
          total: all.length,
          text: `${ui.modalProgress}: ${done}/${all.length} ${ui.modalItems}`,
        };
      }
      const w = measures.knee.calc(pain as number[], stiffness as number[], func as number[]);
      if (Number.isNaN(w.total)) {
        return { kind: "error" as const, text: w.label };
      }
      const u = ui.scorePts;
      return {
        kind: "full" as const,
        display: `${w.total}/${w.maxTotal} ${u} (${Math.round(w.percent * 10) / 10}%, ${w.label})`,
        percent: w.percent,
        label: w.label,
        rawLabel: ui.womacSumLabel,
      };
    }

    return null;
  }, [region, answers, measures, ui]);

  const canSubmit = preview?.kind === "full";

  const handleApply = () => {
    if (!region || preview?.kind !== "full") return;
    const measureName = measures[region].name;
    const functionalScore = preview.percent;
    const functionalComment = formatComment(ml, measureName, functionalScore, preview.label);

    onApply({
      functionalScore: Math.round(functionalScore * 10) / 10,
      functionalComment,
      measureKey: region,
      measureName,
      outcomeId: activeOutcomeId && activeOutcomeId !== "manual" ? activeOutcomeId : undefined,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="measure-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition"
        onClick={onClose}
        aria-label={ui.modalClose}
      />
      <div className="relative flex max-h-[min(92vh,900px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/60 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">{ui.modalBadge}</p>
            <h2 id="measure-modal-title" className="mt-1 text-lg font-bold text-slate-900">
              {meta ? meta.name : ui.modalTitleFallback}
            </h2>
            {meta && <p className="mt-1 text-xs text-slate-600">{meta.description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-slate-800"
            aria-label={ui.modalClose}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {!region || !meta ? (
            <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-6 text-center text-sm text-amber-900">
              <p className="font-semibold">{ui.modalError}</p>
              <p className="mt-2 text-amber-800/90">{ui.modalErrorHint}</p>
            </div>
          ) : region === "neck" || region === "lumbar" ? (
            <NdiOdiQuestionGrid
              questions={measures[region].questions as MeasureQuestion6[]}
              answers={answers}
              onChange={setAnswer}
              scoreSuffix={ui.scorePts}
            />
          ) : region === "shoulder" ? (
            <QuickDashQuestionGrid
              questions={measures.shoulder.questions}
              answers={answers}
              onChange={setAnswer}
              scoreSuffix={ui.scorePts}
            />
          ) : region === "knee" ? (
            <WomacQuestionGrid
              sections={measures.knee.sections}
              answers={answers}
              onChange={setAnswer}
              scoreSuffix={ui.scorePts}
              sectionLabels={{
                pain: ui.womacPain,
                stiffness: ui.womacStiff,
                function: ui.womacFunc,
              }}
            />
          ) : null}
        </div>

        <footer className="shrink-0 border-t border-slate-100 bg-slate-50/90 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-950">
              <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">{ui.modalPreview}</p>
                {preview?.kind === "full" && (
                  <p className="mt-0.5 font-semibold text-slate-900">{preview.display}</p>
                )}
                {preview?.kind === "partial" && (
                  <p className="mt-0.5 text-slate-700">{preview.text}</p>
                )}
                {preview?.kind === "error" && <p className="mt-0.5 text-rose-700">{preview.text}</p>}
                {!preview && <p className="mt-0.5 text-slate-500">{ui.modalSelectPrompt}</p>}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                {ui.modalCancel}
              </button>
              <button
                type="button"
                disabled={!canSubmit}
                onClick={handleApply}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {ui.modalApply}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function NdiOdiQuestionGrid({
  questions,
  answers,
  onChange,
  scoreSuffix,
}: {
  questions: MeasureQuestion6[];
  answers: Record<number, number>;
  onChange: (id: number, value: number) => void;
  scoreSuffix: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-6">
      {questions.map((q) => (
        <div
          key={q.id}
          className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 shadow-sm"
        >
          <p className="mb-3 text-sm font-semibold text-slate-800">
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">
              {q.id}
            </span>
            {q.text}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {q.options.map((label, idx) => {
              const value = idx;
              const selected = answers[q.id] === value;
              return (
                <label
                  key={idx}
                  className={`flex cursor-pointer flex-col rounded-lg border px-2 py-2 text-center text-[11px] font-medium leading-snug transition ${
                    selected
                      ? "border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-200"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50/40"
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name={`ndi-${q.id}`}
                    checked={selected}
                    onChange={() => onChange(q.id, value)}
                  />
                  <span className="mb-1 text-[10px] font-bold text-blue-600">
                    {value}
                    {scoreSuffix}
                  </span>
                  {label}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function QuickDashQuestionGrid({
  questions,
  answers,
  onChange,
  scoreSuffix,
}: {
  questions: MeasureQuestion5[];
  answers: Record<number, number>;
  onChange: (id: number, value: number) => void;
  scoreSuffix: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-6">
      {questions.map((q) => (
        <div key={q.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-slate-800">
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">
              {q.id}
            </span>
            {q.text}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
            {q.options.map((label, idx) => {
              const value = idx + 1;
              const selected = answers[q.id] === value;
              return (
                <label
                  key={idx}
                  className={`flex cursor-pointer flex-col rounded-lg border px-2 py-2 text-center text-[11px] font-medium leading-snug transition ${
                    selected
                      ? "border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-200"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50/40"
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name={`qd-${q.id}`}
                    checked={selected}
                    onChange={() => onChange(q.id, value)}
                  />
                  <span className="mb-1 text-[10px] font-bold text-blue-600">
                    {value}
                    {scoreSuffix}
                  </span>
                  {label}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function WomacQuestionGrid({
  sections,
  answers,
  onChange,
  scoreSuffix,
  sectionLabels,
}: {
  sections: {
    pain: MeasureQuestionWomac[];
    stiffness: MeasureQuestionWomac[];
    function: MeasureQuestionWomac[];
  };
  answers: Record<number, number>;
  onChange: (id: number, value: number) => void;
  scoreSuffix: string;
  sectionLabels: Record<MeasureQuestionWomac["section"], string>;
}) {
  const blocks: { key: keyof typeof sections; items: MeasureQuestionWomac[] }[] = [
    { key: "pain", items: sections.pain },
    { key: "stiffness", items: sections.stiffness },
    { key: "function", items: sections.function },
  ];

  return (
    <div className="space-y-8">
      {blocks.map(({ key, items }) => (
        <div key={key}>
          <h3 className="mb-4 border-b border-blue-100 pb-2 text-sm font-bold text-blue-800">
            {sectionLabels[key]}
          </h3>
          <div className="grid grid-cols-1 gap-5">
            {items.map((q) => (
              <div key={q.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 shadow-sm">
                <p className="mb-3 text-sm font-semibold text-slate-800">
                  <span className="mr-2 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-blue-100 px-1 text-xs font-bold text-blue-800">
                    {q.id}
                  </span>
                  {q.text}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {q.options.map((label, idx) => {
                    const value = idx;
                    const selected = answers[q.id] === value;
                    return (
                      <label
                        key={idx}
                        className={`flex cursor-pointer flex-col rounded-lg border px-2 py-2 text-center text-[11px] font-medium leading-snug transition ${
                          selected
                            ? "border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-200"
                            : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50/40"
                        }`}
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          name={`womac-${q.id}`}
                          checked={selected}
                          onChange={() => onChange(q.id, value)}
                        />
                        <span className="mb-1 text-[10px] font-bold text-blue-600">
                          {value}
                          {scoreSuffix}
                        </span>
                        {label}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
