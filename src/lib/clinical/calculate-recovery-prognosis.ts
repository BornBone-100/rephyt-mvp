/**
 * Step 1~4 original_data 기반 회복 예측도(100에서 감점) 및 예상 기간 문구.
 */

import { NEURO_PAIN_QUALITIES } from "@/lib/clinical/neuro-screening-constants";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** MMT 문자열에서 0~5 등급 추출 (예: "4", "4/5", "3+", "MMT 2") */
export function parseMmtToNumber(raw: unknown): number | null {
  const s = str(raw);
  if (!s) return null;
  const m = s.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return n;
}

function onsetPenalty(onset: unknown): number {
  const s = String(onset ?? "").trim();
  if (s === "Acute" || /^급성/i.test(s)) return 0;
  if (s === "Subacute" || /아급성|sub-?acute/i.test(s)) return -10;
  if (s === "Chronic" || /만성|chronic/i.test(s)) return -20;
  return 0;
}

const NEURO_KEYWORD_RE =
  /저림|numbness|tingling|저린|방사통|radiat|radicul|전기|electric|shock|신경根|신경근|신경학|nerve\s+root|neuropathic|paresthesia/i;

function combinedClinicalText(
  exam: Record<string, unknown>,
  evaluation: Record<string, unknown>,
  goal: Record<string, unknown>,
): string {
  const parts = [
    str(exam.chiefComplaint),
    str(exam.summary),
    str(exam.notes),
    str(evaluation.clinicalReasoning),
    str(evaluation.summary),
    str(goal.summary),
  ];
  const pq = exam.painQualities;
  if (Array.isArray(pq)) parts.push(pq.join(" "));
  const neuro = asRecord(exam.neuro_symptoms);
  if (neuro) {
    const nq = neuro.painQualities;
    if (Array.isArray(nq)) parts.push(nq.join(" "));
    parts.push(str(neuro.dermatomeFreeText));
  }
  return parts.join(" \n ");
}

function hasNeuroKeywordPenalty(exam: Record<string, unknown>, evaluation: Record<string, unknown>, goal: Record<string, unknown>): boolean {
  if (NEURO_KEYWORD_RE.test(combinedClinicalText(exam, evaluation, goal))) return true;
  const pq = exam.painQualities;
  if (Array.isArray(pq) && pq.some((p) => NEURO_PAIN_QUALITIES.has(String(p)))) return true;
  const neuro = asRecord(exam.neuro_symptoms);
  const nq = neuro?.painQualities;
  if (Array.isArray(nq) && nq.some((p) => NEURO_PAIN_QUALITIES.has(String(p)))) return true;
  return false;
}

const NEURO_DYNAMIC_NAME_RE =
  /ULTT|SLR|Straight\s*Leg\s*Raise|Slump|Femoral\s+nerve|neurodynamic|신경\s*가동|직거상|슬럼프|대퇴신경/i;

function isPositiveSpecialResult(result: unknown): boolean {
  const s = String(result ?? "").toLowerCase();
  return s === "positive" || s.includes("양성") || s.includes("(+)");
}

function hasPositiveNeurodynamicTest(goal: Record<string, unknown>): boolean {
  const nd = goal.neurodynamics;
  if (nd && typeof nd === "object" && !Array.isArray(nd)) {
    for (const [name, val] of Object.entries(nd as Record<string, unknown>)) {
      if (NEURO_DYNAMIC_NAME_RE.test(name) && String(val) === "positive") return true;
    }
  }
  const st = goal.special_tests;
  if (Array.isArray(st)) {
    for (const row of st) {
      const o = asRecord(row);
      if (!o) continue;
      const name = str(o.name);
      const res = o.result;
      if (NEURO_DYNAMIC_NAME_RE.test(name) && isPositiveSpecialResult(res)) return true;
    }
  }
  return false;
}

function hasSevereNervePenalty(exam: Record<string, unknown>, evaluation: Record<string, unknown>, goal: Record<string, unknown>): boolean {
  return hasNeuroKeywordPenalty(exam, evaluation, goal) || hasPositiveNeurodynamicTest(goal);
}

function scanRomMmtForWeak(rom: unknown): boolean {
  const data = asRecord(asRecord(rom)?.data);
  if (!data) return false;
  for (const row of Object.values(data)) {
    const o = asRecord(row);
    if (!o) continue;
    for (const side of [o.left, o.right]) {
      const s = asRecord(side);
      if (!s) continue;
      const v = parseMmtToNumber(s.mmt);
      if (v !== null && v <= 3) return true;
    }
  }
  return false;
}

function scanNeuroExamMyotomeWeak(neuroExam: unknown): boolean {
  const nx = asRecord(neuroExam);
  const my = nx?.myotome;
  if (!my || typeof my !== "object") return false;
  for (const row of Object.values(my as Record<string, unknown>)) {
    const c = asRecord(row);
    if (!c) continue;
    for (const key of ["L", "R"]) {
      const v = parseMmtToNumber(c[key]);
      if (v !== null && v <= 3) return true;
    }
  }
  return false;
}

export type RecoveryPrognosisDeductions = {
  vas: number;
  onset: number;
  nerve: number;
  mmt: number;
};

export type RecoveryPrognosisResult = {
  recovery_score: number;
  recovery_timeframe_ko: string;
  recovery_timeframe_en: string;
  deductions: RecoveryPrognosisDeductions;
};

export function mapRecoveryTimeframeKo(score: number): string {
  if (score >= 80) return "예후 매우 긍정적 (예상: 2~4주 내 기능 회복)";
  if (score >= 60) return "일반적 회복 기대 (예상: 4~8주 집중 재활 요망)";
  if (score >= 40) return "회복 지연 요소 존재 (예상: 8~12주 장기 플랜 필요)";
  return "만성화/신경 손상 단계 (3개월 이상의 보존적 치료 및 재평가 요망)";
}

export function mapRecoveryTimeframeEn(score: number): string {
  if (score >= 80) return "Very favorable prognosis (expected functional recovery within ~2–4 weeks).";
  if (score >= 60) return "Typical recovery expected (plan ~4–8 weeks of focused rehab).";
  if (score >= 40) return "Delayed recovery factors (expect ~8–12 weeks; longer program likely).";
  return "Chronicization / possible nerve involvement stage (≥3 months conservative care and reassessment).";
}

export function clampRecoveryScore(raw: number): number {
  return Math.max(10, Math.min(95, Math.round(raw)));
}

/** 진행 바·텍스트 색 (초록 / 노랑 / 빨강) */
export function getRecoveryTrajectoryTone(score: number): { barClass: string; textClass: string; band: "green" | "amber" | "red" } {
  if (score >= 80) return { barClass: "bg-emerald-500", textClass: "text-emerald-700", band: "green" };
  if (score >= 60) return { barClass: "bg-amber-400", textClass: "text-amber-700", band: "amber" };
  return { barClass: "bg-red-500", textClass: "text-red-600", band: "red" };
}

/** 표시용 ‘주’ 힌트 (AI 주차 박스 보조) */
export function recoveryScoreToWeeksHint(score: number): number {
  if (score >= 80) return 3;
  if (score >= 60) return 6;
  if (score >= 40) return 10;
  return 14;
}

export function calculateRecoveryPrognosis(originalData: unknown): RecoveryPrognosisResult {
  const root = asRecord(originalData) ?? {};
  const exam = asRecord(root.exam) ?? {};
  const evaluation = asRecord(root.evaluation) ?? {};
  const goal = asRecord(root.goal) ?? {};

  let score = 100;

  const vas = typeof exam.vas === "number" && Number.isFinite(exam.vas) ? Math.max(0, Math.min(10, exam.vas)) : null;
  const vasDed = vas != null ? -(vas * 3) : 0;
  score += vasDed;

  const onsetDed = onsetPenalty(exam.onset ?? evaluation.onset);
  score += onsetDed;

  let nerveDed = 0;
  if (hasSevereNervePenalty(exam, evaluation, goal)) {
    nerveDed = -20;
    score += nerveDed;
  }

  let mmtDed = 0;
  if (scanRomMmtForWeak(goal.rom) || scanNeuroExamMyotomeWeak(goal.neuro_exam)) {
    mmtDed = -15;
    score += mmtDed;
  }

  const recovery_score = clampRecoveryScore(score);
  const deductions: RecoveryPrognosisDeductions = {
    vas: vasDed,
    onset: onsetDed,
    nerve: nerveDed,
    mmt: mmtDed,
  };

  return {
    recovery_score,
    recovery_timeframe_ko: mapRecoveryTimeframeKo(recovery_score),
    recovery_timeframe_en: mapRecoveryTimeframeEn(recovery_score),
    deductions,
  };
}

/** DB 스냅샷 우선, 없으면 original_data로 재계산 */
export function resolveRecoveryOnRead(row: {
  recovery_score?: unknown;
  recovery_timeframe?: unknown;
  original_data?: unknown;
}): RecoveryPrognosisResult {
  if (typeof row.recovery_score === "number" && Number.isFinite(row.recovery_score)) {
    const recovery_score = clampRecoveryScore(row.recovery_score);
    const tf =
      typeof row.recovery_timeframe === "string" && row.recovery_timeframe.trim()
        ? row.recovery_timeframe.trim()
        : mapRecoveryTimeframeKo(recovery_score);
    return {
      recovery_score,
      recovery_timeframe_ko: tf,
      recovery_timeframe_en: mapRecoveryTimeframeEn(recovery_score),
      deductions: { vas: 0, onset: 0, nerve: 0, mmt: 0 },
    };
  }
  return calculateRecoveryPrognosis(row.original_data);
}
