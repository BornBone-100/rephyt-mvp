/**
 * Step 1~4 입력(original_data 형태) 기반 문서·삭감 방어 충실도 점수 (0~100).
 * AI 판단과 무관하게 동일 루브릭으로 합산한다.
 */

import { NEURO_PAIN_QUALITIES } from "@/lib/clinical/neuro-screening-constants";

export type DefenseScoreBreakdown = {
  step1: number;
  step2Reasoning: number;
  step2NeuroScreening: number;
  step3Rom: number;
  step3SpecialTests: number;
  step4Plan: number;
  step4Followup: number;
};

export type DefenseScoreResult = {
  total: number;
  breakdown: DefenseScoreBreakdown;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function cellFilled(v: unknown): boolean {
  const s = str(v);
  if (!s || s === "-") return false;
  return true;
}

/** 한쪽에 AROM/PROM/MMT 중 2개 이상 채움 → ‘상세’로 간주 */
function sideDetailed(side: unknown): boolean {
  const o = asRecord(side);
  if (!o) return false;
  const n = [o.arom, o.prom, o.mmt].filter(cellFilled).length;
  return n >= 2;
}

function isRotationMovementKey(movementKey: string): boolean {
  return /내회전|외회전|회전|internal\s*rotation|external\s*rotation|\bIR\b|\bER\b/i.test(movementKey);
}

function romDataQualifies(rom: unknown): boolean {
  const r = asRecord(rom);
  const data = r?.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  for (const [mov, row] of Object.entries(data as Record<string, unknown>)) {
    const o = asRecord(row);
    if (!o) continue;
    const left = o.left;
    const right = o.right;
    const bilateralDetailed = sideDetailed(left) && sideDetailed(right);
    const rotationSplit = isRotationMovementKey(mov) && (sideDetailed(left) || sideDetailed(right));
    if (bilateralDetailed || rotationSplit) return true;
  }
  return false;
}

function countSpecialTestLikeEntries(goal: Record<string, unknown>): number {
  const st = goal.special_tests;
  if (Array.isArray(st) && st.length > 0) return st.length;
  const nd = goal.neurodynamics;
  if (nd && typeof nd === "object" && !Array.isArray(nd)) {
    return Object.values(nd as Record<string, unknown>).filter((v) => v != null && v !== "" && v !== "not_tested")
      .length;
  }
  return 0;
}

function hasNeuroRelatedScreening(exam: Record<string, unknown>, evaluation: Record<string, unknown>): boolean {
  const pq = exam.painQualities;
  if (Array.isArray(pq) && pq.some((p) => NEURO_PAIN_QUALITIES.has(String(p)))) return true;
  const dq = exam.dermatomeQuick;
  if (Array.isArray(dq) && dq.length > 0) return true;
  if (str(exam.dermatomeFreeText)) return true;
  const neuro = asRecord(exam.neuro_symptoms);
  if (neuro) {
    const nq = neuro.painQualities;
    if (Array.isArray(nq) && nq.some((p) => NEURO_PAIN_QUALITIES.has(String(p)))) return true;
    const ndq = neuro.dermatomeQuick;
    if (Array.isArray(ndq) && ndq.length > 0) return true;
    if (str(neuro.dermatomeFreeText)) return true;
  }
  const nh = asRecord(evaluation.nerve_entrapment_hypothesis);
  if (nh) {
    if (nh.entrapmentSuspected === true) return true;
    const keys = [
      "differentialNeckDisc",
      "doubleCrushSyndrome",
      "peripheralThoracicOutlet",
      "peripheralCarpalTunnel",
      "peripheralCubitalTunnel",
    ] as const;
    for (const k of keys) {
      if (nh[k] === true) return true;
    }
  }
  return false;
}

function hasVas(exam: Record<string, unknown>): boolean {
  const v = exam.vas;
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 10;
}

function hasOnset(exam: Record<string, unknown>): boolean {
  return str(exam.onset).length > 0;
}

function clinicalReasoningLength(evaluation: Record<string, unknown>): number {
  const a = str(evaluation.clinicalReasoning);
  const b = str(evaluation.summary);
  return Math.max(a.length, b.length);
}

function planText(plan: Record<string, unknown>): string {
  return str(plan.summary);
}

function visitFollowupPresent(plan: Record<string, unknown>): boolean {
  const vf = asRecord(plan.visit_followup);
  if (!vf) return false;
  if (vf.is_flagged === true) return true;
  if (str(vf.special_notes).length > 0) return true;
  if (str(vf.change_log).length > 0) return true;
  return false;
}

/**
 * @param originalData — 저장 시 `original_data` JSON과 동일한 형태( exam / evaluation / goal / plan )
 */
export function calculateDefenseScore(originalData: unknown): DefenseScoreResult {
  const root = asRecord(originalData) ?? {};
  const exam = asRecord(root.exam) ?? {};
  const evaluation = asRecord(root.evaluation) ?? {};
  const goal = asRecord(root.goal) ?? {};
  const plan = asRecord(root.plan) ?? {};

  let step1 = 0;
  if (hasVas(exam)) step1 += 10;
  if (hasOnset(exam)) step1 += 10;

  let step2Reasoning = 0;
  if (clinicalReasoningLength(evaluation) >= 10) step2Reasoning += 10;

  let step2Neuro = 0;
  if (hasNeuroRelatedScreening(exam, evaluation)) step2Neuro += 10;

  let step3Rom = 0;
  if (romDataQualifies(goal.rom)) step3Rom += 20;

  let step3Tests = 0;
  if (countSpecialTestLikeEntries(goal) >= 1) step3Tests += 20;

  let step4Plan = 0;
  if (planText(plan).length > 0) step4Plan += 10;

  let step4Follow = 0;
  if (visitFollowupPresent(plan)) step4Follow += 10;

  const breakdown: DefenseScoreBreakdown = {
    step1,
    step2Reasoning,
    step2NeuroScreening: step2Neuro,
    step3Rom,
    step3SpecialTests: step3Tests,
    step4Plan,
    step4Followup: step4Follow,
  };

  const raw =
    breakdown.step1 +
    breakdown.step2Reasoning +
    breakdown.step2NeuroScreening +
    breakdown.step3Rom +
    breakdown.step3SpecialTests +
    breakdown.step4Plan +
    breakdown.step4Followup;

  const total = Math.max(0, Math.min(100, Math.round(raw)));

  return { total, breakdown };
}

export type DefenseScoreTier = "safe" | "caution" | "risk";

export function getDefenseScoreTier(score: number): DefenseScoreTier {
  if (score >= 90) return "safe";
  if (score >= 70) return "caution";
  return "risk";
}

/** 점수 구간별 Tailwind 텍스트 색 + 메시지 */
export function getDefenseScorePresentation(score: number, locale: "ko" | "en") {
  const tier = getDefenseScoreTier(score);
  const en = locale === "en";
  if (tier === "safe") {
    return {
      tier,
      textClass: "text-emerald-600",
      message: en
        ? "Excellent documentation defense probability (complete clinical record)."
        : "삭감 방어 확률 극상 (완벽한 임상 기록)",
    };
  }
  if (tier === "caution") {
    return {
      tier,
      textClass: "text-amber-500",
      message: en
        ? "Solid record; consider adding objective measures (ROM / special tests) where applicable."
        : "준수한 기록이나, 객관적 검사 수치(ROM/Special Test) 보완 권장",
    };
  }
  return {
    tier,
    textClass: "text-red-500",
    message: en
      ? "High audit risk (insufficient evidence in the chart)."
      : "삭감 위험 높음 (근거 데이터 부족)",
  };
}

/** DB에 저장된 defense_score 우선, 없으면 original_data로 재계산, 그것도 없으면 compliance_score */
export function resolveDefenseScoreOnRead(row: {
  defense_score?: unknown;
  original_data?: unknown;
  compliance_score?: unknown;
}): number {
  if (typeof row.defense_score === "number" && Number.isFinite(row.defense_score)) {
    return Math.max(0, Math.min(100, Math.round(row.defense_score)));
  }
  if (row.original_data != null) {
    return calculateDefenseScore(row.original_data).total;
  }
  if (typeof row.compliance_score === "number" && Number.isFinite(row.compliance_score)) {
    return Math.max(0, Math.min(100, Math.round(row.compliance_score)));
  }
  return 0;
}
