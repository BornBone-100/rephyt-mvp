import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type GuardrailRequest = {
  patientId?: string;
  diagnosisArea?: string;
  locale?: "ko" | "en" | string;
  examination?: string;
  evaluation?: string;
  prognosis?: string;
  intervention?: string;
  /** JSON 문자열 또는 { manual, exercise, modalities, education } 객체 */
  step4?: string | Record<string, unknown>;
  language?: string;
};

type Step4Payload = {
  manual?: unknown;
  exercise?: unknown;
  modalities?: unknown;
  education?: unknown;
};

/** Step4가 배열/객체로 올 때 AI가 처리하기 쉬운 평문 요약으로 변환 */
function normalizeStep4Payload(raw: unknown): Step4Payload | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return null;
    try {
      const parsed = JSON.parse(t) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Step4Payload;
      }
      return { education: t };
    } catch {
      return { education: t };
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Step4Payload;
  }
  return null;
}

function buildPlanSummaryFromStep4(payload: Step4Payload | null): string {
  if (!payload) {
    return [
      "Manual: []",
      "Exercise: []",
      "Modalities: []",
      "Education: (없음)",
    ].join("\n");
  }
  const manual = Array.isArray(payload.manual) ? payload.manual : [];
  const exercise = Array.isArray(payload.exercise) ? payload.exercise : [];
  const modalities = Array.isArray(payload.modalities) ? payload.modalities : [];
  const education =
    typeof payload.education === "string" && payload.education.trim()
      ? payload.education.trim()
      : "(없음)";
  return [
    `Manual: ${JSON.stringify(manual)}`,
    `Exercise: ${JSON.stringify(exercise)}`,
    `Modalities: ${JSON.stringify(modalities)}`,
    `Education: ${education}`,
  ].join("\n");
}

/** API 경계에서 PHI 패턴 추가 제거 (클라이언트 스크럽 보완) */
function scrubClinicalTextServer(input: string): string {
  let s = input;
  s = s.replace(/\b\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g, "[연락처 제거]");
  s = s.replace(/\b\d{4}[./-]\d{1,2}[./-]\d{1,2}\b/g, "[생년월일 제거]");
  s = s.replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g, "[날짜 제거]");
  s = s.replace(/[가-힣]{2,4}\s*(님|씨)(?=\s|$|[,.!?])/g, "Patient");
  s = s.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[ID 제거]");
  return s;
}

type GuardrailResponse = {
  hasRedFlag: boolean;
  criticalAlert: {
    title: string;
    suspectedCondition: string;
    reason: string;
    action: string;
  } | null;
  complianceScore: number;
  status: string;
  cpgAlerts: Array<{
    type: string;
    text: string;
    status?: string | null;
  }>;
  clinicalReasoning: string;
  nextSteps: string[];
  references: Array<{
    title: string;
    url: string;
  }>;
  overallScore?: number;
  trafficLightFeedback?: Array<{
    level: "green" | "yellow" | "red";
    title: string;
    description: string;
  }>;
  evidenceBasedAlternatives?: Array<{
    type: "special_test" | "intervention";
    title: string;
    description: string;
    citation: string;
  }>;
  interventionStrategy?: string;
  professionalDiscussion?: string;
  differentialDiagnosis?: string;
  detectionMeta?: {
    conditionId: string;
    matchedAliases: string[];
    scoreBreakdown: Record<string, number>;
    tuningVersion: string;
  };
};

type CanonicalAlertType =
  | "Strong Recommendation"
  | "Missing Level A Recommendation"
  | "Low-Value Care Alert"
  | "Safety Concern";

function coerceAlertType(type: string): CanonicalAlertType {
  const t = type.toLowerCase();
  if (t.includes("low-value") || t.includes("low value") || t.includes("불필요") || t.includes("근거 부족")) {
    return "Low-Value Care Alert";
  }
  if (t.includes("level a") && t.includes("missing")) {
    return "Missing Level A Recommendation";
  }
  if (t.includes("safety") || t.includes("금기") || t.includes("주의")) {
    return "Safety Concern";
  }
  return "Strong Recommendation";
}

type ConditionRule = {
  id: "achilles" | "lowBackPain" | "rotatorCuff" | "kneeOA" | "neckPain" | "ankleSprain" | "generic";
  keywords: string[];
  lowValueWarning: string;
  levelARecommendation: string;
  references: Array<{ title: string; url: string }>;
  diagnosisPatterns?: RegExp[];
  icdHints?: string[];
};

type AliasTuning = {
  alias: string;
  weightDelta: number;
};

const BASE_ALIAS_WEIGHT = 1;
const TUNING_VERSION = "v1-feedback-weighted";

/** Supabase public 스키마 테이블명 (오타 방지) */
const CDSS_GUARDRAIL_LOGS_TABLE = "cdss_guardrail_logs" as const;
const ALLOWED_COLUMNS = [
  "patient_id",
  "diagnosis_area",
  "overall_score",
  "clinical_reasoning",
  "differential_diagnosis",
  "logic_audit",
  "cpg_compliance",
  "audit_defense",
  "predictive_trajectory",
  "compliance_score",
  "detected_condition_id",
  "has_red_flag",
  "matched_aliases",
  "score_breakdown",
  "intervention_strategy",
  "professional_discussion",
  "raw_ai_response",
] as const;
const CDSS_GUARDRAIL_ALLOWED_KEYS = new Set<string>(ALLOWED_COLUMNS);

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function loadAliasTuningMap() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return new Map<string, number>();
  try {
    const { data, error } = await supabase
      .from("cdss_guardrail_alias_tuning")
      .select("alias, weight_delta")
      .limit(5000);
    if (error || !data) return new Map<string, number>();
    const map = new Map<string, number>();
    (data as Array<{ alias?: string; weight_delta?: number }>).forEach((row) => {
      if (!row.alias || typeof row.weight_delta !== "number") return;
      map.set(row.alias.toLowerCase(), row.weight_delta);
    });
    return map;
  } catch {
    return new Map<string, number>();
  }
}

function toAliasWeights(rule: ConditionRule, tuningMap: Map<string, number>) {
  return rule.keywords.map((alias) => {
    const tuned = tuningMap.get(alias.toLowerCase()) ?? 0;
    return { alias, weight: BASE_ALIAS_WEIGHT + tuned };
  });
}

function scoreRuleByAliases(input: string, rule: ConditionRule, tuningMap: Map<string, number>) {
  const lower = input.toLowerCase();
  const aliasWeights = toAliasWeights(rule, tuningMap);
  const matched = aliasWeights.filter(({ alias }) => lower.includes(alias.toLowerCase()));
  const score = matched.reduce((acc, cur) => acc + cur.weight, 0);
  return {
    score,
    matchedAliases: matched.map((m) => m.alias),
  };
}

const CONDITION_RULES: ConditionRule[] = [
  {
    id: "achilles",
    keywords: [
      "achilles",
      "아킬레스",
      "tendinopathy",
      "건병증",
      "achillodynia",
      "아킬레스건",
      "아킬레스 통증",
      "종골건",
    ],
    diagnosisPatterns: [
      /achilles\s+tendinopathy/i,
      /achilles\s+tendon\s+pain/i,
      /아킬레스.*건병증/i,
      /mid-?portion\s+achilles/i,
      /insertional\s+achilles/i,
      /아킬레스건염/i,
      /아킬레스건\s*통증/i,
      /종골건.*통증/i,
    ],
    icdHints: ["m76.6", "m67.88", "m76.60", "m76.61", "m76.62"],
    lowValueWarning:
      "JOSPT Achilles Tendinopathy CPG에 따르면 수동적 물리치료(예: 초음파) 단독 적용은 근거가 제한적입니다. 능동적 부하 기반 프로그램 병행을 우선 고려하세요.",
    levelARecommendation:
      "JOSPT 2024 Achilles Tendinopathy CPG에 따르면 점진적 부하 운동(heavy slow resistance 포함)은 Level A 권고입니다. 중재 계획에 명시적으로 포함하세요.",
    references: [
      { title: "JOSPT Achilles Pain/Stiffness CPG", url: "https://www.jospt.org/" },
      { title: "APTA Clinical Practice Resources", url: "https://www.apta.org/" },
    ],
  },
  {
    id: "lowBackPain",
    keywords: [
      "low back",
      "요통",
      "허리",
      "lumbar",
      "lbp",
      "nslbp",
      "요추염좌",
      "요천추통",
      "허리디스크",
      "요추 디스크",
    ],
    diagnosisPatterns: [
      /non-?specific\s+low\s+back\s+pain/i,
      /chronic\s+low\s+back\s+pain/i,
      /요추.*통증/i,
      /요통/i,
      /요추염좌/i,
      /요천추.*통/i,
      /lumbar\s+strain/i,
      /lumbar\s+sprain/i,
      /discogenic\s+low\s+back\s+pain/i,
    ],
    icdHints: ["m54.5", "m54.50", "m54.59", "s33.5", "m51.2", "m51.26"],
    lowValueWarning:
      "JOSPT 요통 가이드라인에서는 비특이적 요통에서 수동적 처치 의존 전략은 장기효과가 제한적일 수 있어 주의가 필요합니다.",
    levelARecommendation:
      "JOSPT/APTA 요통 가이드라인에 따르면 교육 + 활동 유지 + 운동치료 조합은 강력 권고(Level A)에 해당합니다. 계획에 핵심축으로 배치하세요.",
    references: [
      { title: "JOSPT Low Back Pain CPG", url: "https://www.jospt.org/" },
      { title: "APTA Low Back Pain Guideline", url: "https://www.apta.org/" },
    ],
  },
  {
    id: "rotatorCuff",
    keywords: [
      "rotator cuff",
      "회전근개",
      "shoulder",
      "견관절",
      "sap",
      "saps",
      "충돌증후군",
      "유착성 관절낭염",
      "오십견",
    ],
    diagnosisPatterns: [
      /rotator\s+cuff/i,
      /subacromial\s+pain/i,
      /subacromial\s+impingement/i,
      /회전근개/i,
      /어깨\s*충돌/i,
      /견봉하\s*통증/i,
      /오십견/i,
      /유착성\s*관절낭염/i,
      /shoulder\s+impingement/i,
    ],
    icdHints: ["m75.1", "m75.4", "m75.0", "m75.8", "m75.10"],
    lowValueWarning:
      "회전근개 관련 통증에서 수동적 물리치료 단독 접근은 근거가 제한될 수 있습니다. 기능 기반 능동운동 중심으로 재구성하세요.",
    levelARecommendation:
      "JOSPT 어깨 통증 관련 권고에 따르면 점진적 저항운동과 기능 회복 중심 운동치료는 강한 권고(Level A)입니다. 중재에 우선 반영하세요.",
    references: [
      { title: "JOSPT Shoulder Pain CPG", url: "https://www.jospt.org/" },
      { title: "APTA Shoulder Guideline Resources", url: "https://www.apta.org/" },
    ],
  },
  {
    id: "kneeOA",
    keywords: [
      "knee oa",
      "knee osteoarthritis",
      "무릎 골관절염",
      "퇴행성 무릎",
      "gonarthrosis",
      "퇴행성슬관절염",
      "슬관절 oa",
      "knee djd",
    ],
    diagnosisPatterns: [
      /knee\s+osteoarthritis/i,
      /knee\s+oa/i,
      /무릎.*골관절염/i,
      /퇴행성.*무릎/i,
      /퇴행성슬관절염/i,
      /슬관절.*골관절염/i,
      /gonarthrosis/i,
      /degenerative\s+knee\s+joint/i,
    ],
    icdHints: ["m17", "m17.0", "m17.1", "m17.9", "m17.10", "m17.11", "m17.12"],
    lowValueWarning:
      "무릎 골관절염에서 수동적 처치 단독 접근은 임상적 효과가 제한될 수 있습니다. 기능 회복을 위한 능동 운동과 교육을 우선하세요.",
    levelARecommendation:
      "JOSPT/APTA 무릎 OA 권고에 따르면 운동치료(근력+유산소+기능훈련)와 자기관리 교육은 강한 권고(Level A)입니다. 계획에 구조적으로 반영하세요.",
    references: [
      { title: "JOSPT Knee Osteoarthritis CPG", url: "https://www.jospt.org/" },
      { title: "APTA Knee OA Guideline", url: "https://www.apta.org/" },
    ],
  },
  {
    id: "neckPain",
    keywords: [
      "neck pain",
      "경추",
      "목 통증",
      "cervical",
      "csp",
      "거북목",
      "경부통",
      "목디스크",
      "경추 디스크",
    ],
    diagnosisPatterns: [
      /neck\s+pain/i,
      /cervical\s+pain/i,
      /mechanical\s+neck\s+pain/i,
      /경추.*통증/i,
      /목\s*통증/i,
      /경부통/i,
      /경추염좌/i,
      /whiplash/i,
      /cervical\s+radiculopathy/i,
    ],
    icdHints: ["m54.2", "m47.81", "m43.6", "s13.4", "m50.1", "m50.10", "m50.12"],
    lowValueWarning:
      "경부 통증에서 수동적 치료 의존 전략은 장기 예후 개선에 제한적일 수 있습니다. 능동운동과 기능적 재훈련 병행이 필요합니다.",
    levelARecommendation:
      "JOSPT 목 통증 가이드라인에서는 환자 교육, 점진적 운동, 필요 시 수기치료 병행 전략이 근거 기반 권고(Level A)에 해당합니다.",
    references: [
      { title: "JOSPT Neck Pain CPG", url: "https://www.jospt.org/" },
      { title: "APTA Cervical Guidelines", url: "https://www.apta.org/" },
    ],
  },
  {
    id: "ankleSprain",
    keywords: [
      "ankle sprain",
      "발목 염좌",
      "lateral ankle",
      "atfl",
      "ca ligaments",
      "발목 접질림",
      "외측 인대",
      "cai",
      "chronic ankle instability",
    ],
    diagnosisPatterns: [
      /ankle\s+sprain/i,
      /lateral\s+ankle\s+sprain/i,
      /발목.*염좌/i,
      /발목\s*접질림/i,
      /atfl/i,
      /cfl/i,
      /chronic\s+ankle\s+instability/i,
      /외측\s*인대\s*손상/i,
    ],
    icdHints: ["s93.4", "s93.401", "s93.402", "s93.409", "m25.37"],
    lowValueWarning:
      "급성기 이후 발목 염좌에서 수동적 처치 단독은 재손상 예방 측면에서 제한적입니다. 고유수용감각 및 기능훈련을 병행하세요.",
    levelARecommendation:
      "JOSPT 발목 염좌 가이드라인에 따르면 조기 체중부하, 균형/신경근 훈련, 단계적 기능 복귀 프로그램은 강력 권고(Level A)입니다.",
    references: [
      { title: "JOSPT Lateral Ankle Sprain CPG", url: "https://www.jospt.org/" },
      { title: "APTA Ankle Sprain Guidance", url: "https://www.apta.org/" },
    ],
  },
  {
    id: "generic",
    keywords: [],
    lowValueWarning:
      "JOSPT 202X 가이드라인에 따르면 근거가 낮은 수동적 치료의 단독 사용은 권고되지 않습니다. 환자 상태에 맞는 능동적 중재 병행 여부를 재검토하세요.",
    levelARecommendation:
      "JOSPT 202X 가이드라인에 따르면 해당 질환군에서 Level A 권고 중재(예: 점진적 부하 운동/기능 중심 운동)가 핵심입니다. 계획에 포함했는지 확인하세요.",
    references: [
      { title: "JOSPT Clinical Practice Guidelines", url: "https://www.jospt.org/" },
      { title: "APTA Evidence-Based Practice", url: "https://www.apta.org/" },
    ],
  },
];

function detectConditionRuleFromEvaluation(evaluation: string): ConditionRule | null {
  const lowerEval = evaluation.toLowerCase();
  const matchedByPattern = CONDITION_RULES.find(
    (rule) =>
      rule.id !== "generic" &&
      ((rule.diagnosisPatterns?.some((re) => re.test(evaluation)) ?? false) ||
        (rule.icdHints?.some((icd) => lowerEval.includes(icd)) ?? false)),
  );
  return matchedByPattern ?? null;
}

function detectConditionRuleFromAllText(input: string, tuningMap: Map<string, number>) {
  const scored = CONDITION_RULES.filter((r) => r.id !== "generic").map((rule) => ({
    rule,
    ...scoreRuleByAliases(input, rule, tuningMap),
  }));
  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (!top || top.score <= 0) return null;
  return {
    rule: top.rule,
    matchedAliases: top.matchedAliases,
    scoreBreakdown: Object.fromEntries(scored.map((s) => [s.rule.id, s.score])),
  };
}

function getGenericRule(): ConditionRule {
  return CONDITION_RULES.find((r) => r.id === "generic")!;
}

function detectConditionRule(
  evaluation: string,
  fullInput: string,
  tuningMap: Map<string, number>,
): {
  rule: ConditionRule;
  matchedAliases: string[];
  scoreBreakdown: Record<string, number>;
} {
  const byEval = detectConditionRuleFromEvaluation(evaluation);
  if (byEval) {
    return {
      rule: byEval,
      matchedAliases: [],
      scoreBreakdown: { [byEval.id]: 100 },
    };
  }
  const byAll = detectConditionRuleFromAllText(fullInput, tuningMap);
  if (byAll) return byAll;
  const generic = getGenericRule();
  return {
    rule: generic,
    matchedAliases: [],
    scoreBreakdown: { [generic.id]: 0 },
  };
}

/** 모델이 JSON 외 마크다운/장식을 섞었을 때 파싱 성공률을 높임 */
function stripMarkdownAndFenceArtifacts(raw: string): string {
  let s = raw
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/^\s*#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
  return s;
}

function parseModelJson(content: string): { ok: true; data: unknown } | { ok: false } {
  const cleaned = stripMarkdownAndFenceArtifacts(content);
  try {
    return { ok: true, data: JSON.parse(cleaned) };
  } catch {
    const matched = cleaned.match(/\{[\s\S]*\}/);
    if (!matched) {
      console.error("CDSS parseModelJson: JSON object block not found", { preview: cleaned.slice(0, 500) });
      return { ok: false };
    }
    const inner = stripMarkdownAndFenceArtifacts(matched[0]);
    try {
      return { ok: true, data: JSON.parse(inner) };
    } catch (fallbackError) {
      console.error("CDSS parseModelJson fallback parse failed", {
        message: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        preview: inner.slice(0, 500),
      });
      return { ok: false };
    }
  }
}

function normalizeGuardrailResponse(raw: unknown): GuardrailResponse {
  const data = (raw ?? {}) as Partial<GuardrailResponse> & {
    score?: number;
    alerts?: Array<{ type?: string; text?: string; status?: string }>;
    reasoning?: string;
    logicChainAudit?: {
      status?: "pass" | "fail" | "warning";
      feedback?: string;
      missingLinks?: string[];
    };
    cpgCompliance?: Array<{
      intervention?: string;
      level?: "green" | "yellow" | "red";
      reasoning?: string;
      alternative?: string | null;
    }>;
    auditDefense?: {
      riskLevel?: "Low" | "Medium" | "High";
      defenseScore?: number;
      feedback?: string;
      improvementTip?: string;
    };
    predictiveTrajectory?: {
      estimatedWeeks?: number;
      trajectoryText?: string;
    };
    intervention_strategy?: string;
    professional_discussion?: string;
    clinical_reasoning?: string;
    differential_diagnosis?: string;
  };
  const mappedTraffic = Array.isArray(data.cpgCompliance)
    ? data.cpgCompliance
        .map((item) => {
          if (!item?.intervention || !item?.level || !item?.reasoning) return null;
          if (item.level !== "green" && item.level !== "yellow" && item.level !== "red") return null;
          return {
            level: item.level,
            title: item.intervention,
            description: item.reasoning,
          };
        })
        .filter((v): v is NonNullable<GuardrailResponse["trafficLightFeedback"]>[number] => Boolean(v))
    : [];
  const mappedAlerts = Array.isArray(data.cpgCompliance)
    ? data.cpgCompliance
        .map((item) => {
          if (!item?.intervention || !item?.level || !item?.reasoning) return null;
          return {
            type: item.level === "green" ? "Strong Recommendation" : "Low-Value Care Alert",
            text:
              item.level === "green"
                ? `${item.intervention}: ${item.reasoning}`
                : `${item.intervention}: ${item.reasoning}${item.alternative ? ` / 대안: ${item.alternative}` : ""}`,
            status: item.level === "green" ? "pass" : "warning",
          };
        })
        .filter((v): v is { type: string; text: string; status: string } => Boolean(v))
    : [];
  const mappedReasoning = [
    typeof data.logicChainAudit?.feedback === "string" ? data.logicChainAudit.feedback : "",
    typeof data.auditDefense?.feedback === "string" ? data.auditDefense.feedback : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const mappedNextSteps = [
    ...(Array.isArray(data.logicChainAudit?.missingLinks) ? data.logicChainAudit?.missingLinks : []),
    ...(typeof data.auditDefense?.improvementTip === "string" && data.auditDefense.improvementTip.trim()
      ? [data.auditDefense.improvementTip]
      : []),
    ...(typeof data.predictiveTrajectory?.trajectoryText === "string" && data.predictiveTrajectory.trajectoryText.trim()
      ? [`예후 추정: ${data.predictiveTrajectory.trajectoryText}`]
      : []),
  ];
  return {
    hasRedFlag: Boolean(data.hasRedFlag),
    criticalAlert:
      data.criticalAlert &&
      typeof data.criticalAlert.title === "string" &&
      typeof data.criticalAlert.suspectedCondition === "string" &&
      typeof data.criticalAlert.reason === "string" &&
      typeof data.criticalAlert.action === "string"
        ? data.criticalAlert
        : null,
    complianceScore:
      typeof (data.complianceScore ?? data.score ?? data.auditDefense?.defenseScore) === "number" &&
      Number.isFinite(data.complianceScore ?? data.score ?? data.auditDefense?.defenseScore)
        ? Math.max(0, Math.min(100, Math.round((data.complianceScore ?? data.score ?? data.auditDefense?.defenseScore) as number)))
        : 0,
    status:
      typeof data.status === "string" && data.status.trim()
        ? data.status
        : data.auditDefense?.riskLevel === "High"
          ? "Caution"
          : data.logicChainAudit?.status === "pass"
            ? "High-Value Care"
            : "Needs Review",
    cpgAlerts: Array.isArray(data.cpgAlerts ?? data.alerts)
      ? (data.cpgAlerts ?? data.alerts ?? [])
          .flatMap((item) => {
            const alert = item as { type?: string; text?: string; status?: string };
            if (!alert?.type || !alert?.text) return [];
            return [
              {
                type: coerceAlertType(alert.type),
                text: alert.text,
                status: alert.status || "warning",
              },
            ];
          })
      : mappedAlerts,
    clinicalReasoning:
      typeof (data.clinicalReasoning ?? data.clinical_reasoning ?? data.reasoning ?? mappedReasoning) === "string" &&
      (data.clinicalReasoning ?? data.clinical_reasoning ?? data.reasoning ?? mappedReasoning)?.trim()
        ? ((data.clinicalReasoning ?? data.clinical_reasoning ?? data.reasoning ?? mappedReasoning) as string)
        : "입력된 임상 정보를 기반으로 추가 검토가 필요합니다.",
    nextSteps: Array.isArray(data.nextSteps)
      ? data.nextSteps.filter((x): x is string => typeof x === "string")
      : mappedNextSteps,
    references: Array.isArray(data.references)
      ? data.references
          .map((item) => {
            const ref = item as { title?: string; url?: string };
            if (!ref?.title || !ref?.url) return null;
            try {
              const parsedUrl = new URL(ref.url);
              if (!parsedUrl.protocol.startsWith("http")) return null;
              return { title: ref.title, url: ref.url };
            } catch {
              return null;
            }
          })
          .filter((x): x is GuardrailResponse["references"][number] => Boolean(x))
      : [],
    overallScore:
      typeof (data as { overallScore?: number }).overallScore === "number"
        ? Math.max(0, Math.min(100, Math.round((data as { overallScore?: number }).overallScore as number)))
        : typeof data.auditDefense?.defenseScore === "number"
          ? Math.max(0, Math.min(100, Math.round(data.auditDefense.defenseScore)))
          : undefined,
    trafficLightFeedback: Array.isArray((data as { trafficLightFeedback?: unknown[] }).trafficLightFeedback)
      ? ((data as { trafficLightFeedback: unknown[] }).trafficLightFeedback
          .map((item) => {
            const v = item as { level?: string; title?: string; description?: string };
            if (!v?.level || !v?.title || !v?.description) return null;
            const level = v.level === "green" || v.level === "yellow" || v.level === "red" ? v.level : null;
            if (!level) return null;
            return { level, title: v.title, description: v.description };
          })
          .filter(
            (x): x is NonNullable<GuardrailResponse["trafficLightFeedback"]>[number] => Boolean(x),
          ))
      : mappedTraffic,
    evidenceBasedAlternatives: Array.isArray((data as { evidenceBasedAlternatives?: unknown[] }).evidenceBasedAlternatives)
      ? ((data as { evidenceBasedAlternatives: unknown[] }).evidenceBasedAlternatives
          .map((item) => {
            const v = item as { type?: string; title?: string; description?: string; citation?: string };
            if (!v?.type || !v?.title || !v?.description) return null;
            const type = v.type === "special_test" || v.type === "intervention" ? v.type : null;
            if (!type) return null;
            return {
              type,
              title: v.title,
              description: v.description,
              citation: typeof v.citation === "string" ? v.citation : "",
            };
          })
          .filter(
            (x): x is NonNullable<GuardrailResponse["evidenceBasedAlternatives"]>[number] => Boolean(x),
          ))
      : [],
    interventionStrategy:
      typeof (data as { interventionStrategy?: unknown; intervention_strategy?: unknown }).interventionStrategy ===
        "string" &&
      ((data as { interventionStrategy?: string }).interventionStrategy ?? "").trim()
        ? (data as { interventionStrategy: string }).interventionStrategy
        : typeof (data as { intervention_strategy?: unknown }).intervention_strategy === "string" &&
            ((data as { intervention_strategy?: string }).intervention_strategy ?? "").trim()
          ? (data as { intervention_strategy: string }).intervention_strategy
          : "",
    professionalDiscussion:
      typeof (data as { professionalDiscussion?: unknown; professional_discussion?: unknown }).professionalDiscussion ===
        "string" &&
      ((data as { professionalDiscussion?: string }).professionalDiscussion ?? "").trim()
        ? (data as { professionalDiscussion: string }).professionalDiscussion
        : typeof (data as { professional_discussion?: unknown }).professional_discussion === "string" &&
            ((data as { professional_discussion?: string }).professional_discussion ?? "").trim()
          ? (data as { professional_discussion: string }).professional_discussion
          : "",
    differentialDiagnosis:
      typeof (data as { differentialDiagnosis?: unknown; differential_diagnosis?: unknown }).differentialDiagnosis ===
        "string" &&
      ((data as { differentialDiagnosis?: string }).differentialDiagnosis ?? "").trim()
        ? (data as { differentialDiagnosis: string }).differentialDiagnosis
        : typeof (data as { differential_diagnosis?: unknown }).differential_diagnosis === "string" &&
            ((data as { differential_diagnosis?: string }).differential_diagnosis ?? "").trim()
          ? (data as { differential_diagnosis: string }).differential_diagnosis
          : "",
  } satisfies GuardrailResponse;
}

function mergeUniqueReferences(
  modelRefs: GuardrailResponse["references"],
  ruleRefs: GuardrailResponse["references"],
): GuardrailResponse["references"] {
  const map = new Map<string, { title: string; url: string }>();
  [...modelRefs, ...ruleRefs].forEach((ref) => {
    map.set(ref.url, ref);
  });
  return [...map.values()];
}

function enforceGuardrails(response: GuardrailResponse, rule: ConditionRule): GuardrailResponse {
  if (response.hasRedFlag) {
    return {
      ...response,
      complianceScore: 0,
      overallScore: 0,
      status: response.status || "Medical Referral Required",
      cpgAlerts: [
        {
          type: "Safety Concern",
          status: "warning",
          text:
            response.criticalAlert?.reason ??
            "Red Flag 소견이 의심되어 일반 CPG 평가보다 의학적 의뢰가 우선입니다.",
        },
      ],
      nextSteps: [
        response.criticalAlert?.action ?? "물리치료를 보류하고 적절한 진료과로 즉시 의뢰하세요.",
      ],
    };
  }

  const hasLowValueWarning = response.cpgAlerts.some((a) => a.type === "Low-Value Care Alert" && a.status === "warning");
  const hasLevelARecommendation = response.cpgAlerts.some(
    (a) => a.type === "Strong Recommendation" || a.type === "Missing Level A Recommendation",
  );

  const patchedAlerts = [...response.cpgAlerts];

  if (!hasLowValueWarning) {
    patchedAlerts.push({
      type: "Low-Value Care Alert",
      status: "warning",
      text: rule.lowValueWarning,
    });
  }

  if (!hasLevelARecommendation) {
    patchedAlerts.push({
      type: "Missing Level A Recommendation",
      status: "warning",
      text: rule.levelARecommendation,
    });
  }

  return {
    ...response,
    overallScore:
      typeof response.overallScore === "number" ? response.overallScore : response.complianceScore,
    cpgAlerts: patchedAlerts,
    references: mergeUniqueReferences(response.references, rule.references),
  };
}

/** OpenAI 원본 JSON → DB jsonb 컬럼용 필드 추출 */
function extractModelFieldsForLog(raw: unknown): {
  logic_audit: unknown;
  cpg_compliance: unknown;
  audit_defense: unknown;
  predictive_trajectory: unknown;
  overall_from_model: number | null;
} {
  if (!raw || typeof raw !== "object") {
    return {
      logic_audit: null,
      cpg_compliance: null,
      audit_defense: null,
      predictive_trajectory: null,
      overall_from_model: null,
    };
  }
  const o = raw as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    logic_audit: o.logicChainAudit ?? null,
    cpg_compliance: o.cpgCompliance ?? null,
    audit_defense: o.auditDefense ?? null,
    predictive_trajectory: o.predictiveTrajectory ?? null,
    overall_from_model: num(o.overallScore) ?? num(o.score) ?? num((o.auditDefense as { defenseScore?: number } | undefined)?.defenseScore),
  };
}

function buildGuardrailLogRow(params: {
  request: GuardrailRequest;
  detectedConditionId: string;
  matchedAliases: string[];
  scoreBreakdown: Record<string, number>;
  result: GuardrailResponse;
  rawModelJson: unknown;
}): Record<string, unknown> {
  const ex = extractModelFieldsForLog(params.rawModelJson);
  const overallScore = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        ex.overall_from_model ??
          params.result.overallScore ??
          params.result.complianceScore ??
          0,
      ),
    ),
  );
  return {
    patient_id: typeof params.request.patientId === "string" ? params.request.patientId : null,
    diagnosis_area: typeof params.request.diagnosisArea === "string" ? params.request.diagnosisArea : null,
    overall_score: overallScore,
    clinical_reasoning: params.result.clinicalReasoning ?? "",
    differential_diagnosis: params.result.differentialDiagnosis ?? "",
    logic_audit: ex.logic_audit,
    cpg_compliance: ex.cpg_compliance,
    audit_defense: ex.audit_defense,
    predictive_trajectory: ex.predictive_trajectory,
    has_red_flag: params.result.hasRedFlag,
    compliance_score: params.result.complianceScore,
    detected_condition_id: params.detectedConditionId,
    matched_aliases: params.matchedAliases,
    score_breakdown: params.scoreBreakdown,
    intervention_strategy: params.result.interventionStrategy ?? "",
    professional_discussion: params.result.professionalDiscussion ?? "",
  };
}

/** 스키마가 아직 확장되지 않은 경우: 핵심 컬럼만 재시도 */
function buildGuardrailLogRowLegacy(params: {
  request: GuardrailRequest;
  detectedConditionId: string;
  matchedAliases: string[];
  scoreBreakdown: Record<string, number>;
  result: GuardrailResponse;
  rawModelJson: unknown;
}): Record<string, unknown> {
  const ex = extractModelFieldsForLog(params.rawModelJson);
  const overallScore = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        ex.overall_from_model ??
          params.result.overallScore ??
          params.result.complianceScore ??
          0,
      ),
    ),
  );
  return {
    patient_id: typeof params.request.patientId === "string" ? params.request.patientId : null,
    diagnosis_area: typeof params.request.diagnosisArea === "string" ? params.request.diagnosisArea : null,
    overall_score: overallScore,
    clinical_reasoning: params.result.clinicalReasoning ?? "",
    differential_diagnosis: params.result.differentialDiagnosis ?? "",
    logic_audit: ex.logic_audit,
    cpg_compliance: ex.cpg_compliance,
    audit_defense: ex.audit_defense,
    predictive_trajectory: ex.predictive_trajectory,
    detected_condition_id: params.detectedConditionId,
    matched_aliases: params.matchedAliases,
    score_breakdown: params.scoreBreakdown,
    has_red_flag: params.result.hasRedFlag,
    compliance_score: params.result.complianceScore,
    intervention_strategy: params.result.interventionStrategy ?? "",
    professional_discussion: params.result.professionalDiscussion ?? "",
  };
}

function sanitizeGuardrailInsertPayload(
  row: Record<string, unknown>,
  rawModelJson: unknown,
  request: GuardrailRequest,
  result: GuardrailResponse,
): Record<string, unknown> {
  const aiResult = rawModelJson && typeof rawModelJson === "object" ? (rawModelJson as Record<string, unknown>) : {};
  const aiCandidateToColumn: Record<string, string> = {
    overallScore: "overall_score",
    score: "overall_score",
    logicChainAudit: "logic_audit",
    cpgCompliance: "cpg_compliance",
    auditDefense: "audit_defense",
    predictiveTrajectory: "predictive_trajectory",
    complianceScore: "compliance_score",
    hasRedFlag: "has_red_flag",
    intervention_strategy: "intervention_strategy",
    interventionStrategy: "intervention_strategy",
    professional_discussion: "professional_discussion",
    professionalDiscussion: "professional_discussion",
    score_breakdown: "score_breakdown",
    scoreBreakdown: "score_breakdown",
  };
  const aiDerivedColumns: Record<string, unknown> = {};
  const unknownAiFields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(aiResult)) {
    const mappedColumn = aiCandidateToColumn[key];
    if (mappedColumn && CDSS_GUARDRAIL_ALLOWED_KEYS.has(mappedColumn)) {
      aiDerivedColumns[mappedColumn] = value;
      continue;
    }
    unknownAiFields[key] = value;
  }

  const mergedRow = { ...aiDerivedColumns, ...row };
  const sanitizedPayload: Record<string, unknown> = {};
  const droppedRowKeys: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(mergedRow)) {
    if (CDSS_GUARDRAIL_ALLOWED_KEYS.has(key)) sanitizedPayload[key] = value;
    else droppedRowKeys[key] = value;
  }
  sanitizedPayload.raw_ai_response = {
    model_response: rawModelJson,
    dropped_row_keys: droppedRowKeys,
    unknown_ai_fields: unknownAiFields,
    allowed_columns: ALLOWED_COLUMNS,
    request_payload: request,
    normalized_result: result,
  };
  return sanitizedPayload;
}

async function syncTreatmentLogIfPossible(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  request: GuardrailRequest,
): Promise<void> {
  if (!supabase) return;
  const patientId = typeof request.patientId === "string" ? request.patientId.trim() : "";
  const content = typeof request.intervention === "string" ? request.intervention.trim() : "";
  if (!patientId || !content) return;

  const { error } = await supabase.from("treatments").insert({
    patient_id: patientId,
    content,
  } as never);
  if (error) {
    console.warn("CDSS syncTreatmentLogIfPossible failed:", error.code, error.message);
  }
}

function extractUnknownColumnFromInsertError(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const e = error as { message?: string; details?: string; hint?: string; code?: string };
  const source = [e.message, e.details, e.hint].filter((v): v is string => typeof v === "string").join(" ");
  if (!source) return null;

  // PostgREST 예시:
  // "Could not find the 'result_snapshot' column of 'cdss_guardrail_logs' in the schema cache"
  const postgrestMatch = source.match(/Could not find the '([^']+)' column/i);
  if (postgrestMatch?.[1]) return postgrestMatch[1];

  // PostgreSQL 예시:
  // 'column "result_snapshot" of relation "cdss_guardrail_logs" does not exist'
  const postgresMatch = source.match(/column\s+"([^"]+)"\s+of\s+relation/i);
  if (postgresMatch?.[1]) return postgresMatch[1];

  return null;
}

function splitKnownAndUnknownColumns(
  row: Record<string, unknown>,
  allowedColumns: ReadonlySet<string>,
): { known: Record<string, unknown>; unknown: Record<string, unknown> } {
  const known: Record<string, unknown> = {};
  const unknown: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (allowedColumns.has(key)) known[key] = value;
    else unknown[key] = value;
  }
  return { known, unknown };
}

async function logGuardrailEvent(params: {
  request: GuardrailRequest;
  detectedConditionId: string;
  matchedAliases: string[];
  scoreBreakdown: Record<string, number>;
  result: GuardrailResponse;
  rawModelJson: unknown;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return { ok: true };
    const row = buildGuardrailLogRow(params);
    const legacy = buildGuardrailLogRowLegacy(params);
    let insertRow = sanitizeGuardrailInsertPayload(row, params.rawModelJson, params.request, params.result);

    // DB 스키마와 불일치하는 컬럼이 있으면 컬럼 단위로 제거/격리하며 최대 4회 재시도.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const { error } = await supabase.from(CDSS_GUARDRAIL_LOGS_TABLE).insert(insertRow as never);
      if (!error) {
        await syncTreatmentLogIfPossible(supabase, params.request);
        return { ok: true };
      }

      const unknownColumn = extractUnknownColumnFromInsertError(error);
      if (!unknownColumn) {
        console.error("CDSS logGuardrailEvent insert failed:", error.code, error.message, error.details);
        return { ok: false, message: error.message };
      }

      const unknownValue = insertRow[unknownColumn];
      delete insertRow[unknownColumn];

      // raw_ai_response가 없거나 컬럼이 미지원이면 해당 키를 백업 객체에 병합 시도
      if (unknownColumn !== "raw_ai_response" && unknownValue !== undefined) {
        insertRow.raw_ai_response = {
          ...(typeof insertRow.raw_ai_response === "object" && insertRow.raw_ai_response !== null
            ? (insertRow.raw_ai_response as Record<string, unknown>)
            : {}),
          [`removed_column_${unknownColumn}`]: unknownValue,
        };
      }

      console.warn("CDSS logGuardrailEvent: removed unknown DB column and retrying", {
        unknownColumn,
        attempt: attempt + 1,
      });
    }

    const legacyInsert = sanitizeGuardrailInsertPayload(legacy, params.rawModelJson, params.request, params.result);
    const fallback = await supabase.from(CDSS_GUARDRAIL_LOGS_TABLE).insert(legacyInsert as never);
    if (fallback.error) {
      console.error(
        "CDSS logGuardrailEvent fallback legacy insert failed:",
        fallback.error.code,
        fallback.error.message,
        fallback.error.details,
      );
      return { ok: false, message: fallback.error.message };
    }
    await syncTreatmentLogIfPossible(supabase, params.request);
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("CDSS logGuardrailEvent exception:", message);
    return { ok: false, message };
  }
}

export async function POST(req: Request) {
  try {
    let body: GuardrailRequest;
    try {
      body = (await req.json()) as GuardrailRequest;
    } catch {
      return NextResponse.json(
        { error: "요청 본문(JSON)을 읽을 수 없습니다.", stage: "request_body_parse" },
        { status: 400 },
      );
    }
    const examination = scrubClinicalTextServer((body.examination ?? "").trim());
    const evaluation = scrubClinicalTextServer((body.evaluation ?? "").trim());
    const prognosis = scrubClinicalTextServer((body.prognosis ?? "").trim());
    const intervention = scrubClinicalTextServer((body.intervention ?? "").trim());
    const step4Normalized = normalizeStep4Payload(body.step4);
    const planSummaryRaw = buildPlanSummaryFromStep4(step4Normalized);
    const planSummary = scrubClinicalTextServer(planSummaryRaw);

    if (!examination || !evaluation || !prognosis || !intervention) {
      return NextResponse.json(
        { error: "모든 단계 입력이 필요합니다.", stage: "validation" },
        { status: 400 },
      );
    }
    const fullInput = `${examination}\n${evaluation}\n${prognosis}\n${intervention}`;
    const tuningMap = await loadAliasTuningMap();
    const detected = detectConditionRule(evaluation, fullInput, tuningMap);
    const detectedRule = detected.rule;
    const locale = String(body.locale ?? "").toLowerCase().startsWith("en") ? "en" : "ko";

    const systemPrompt = `
You are a Clinical Director and professor-level orthopedic manual physical therapist (OCS) with over 20 years of experience in pain science and biomechanics.
너는 20년 차 이상의 정형도수물리치료 전문의(OCS)이자 통증과학/생체역학 기반 임상 교수이며, 레지던트 교육 수준의 정밀한 감별 진단 논리를 제공해야 한다.
Never provide generic advice or superficial summaries. Critique the clinician's input sharply and provide evidence-grounded, high-depth clinical insight.
Your task is to analyze the user's 4-step clinical reasoning data (Subjective History, Objective Evaluation, Goals, and Intervention) and evaluate it based on JOSPT Clinical Practice Guidelines (CPG), APTA-aligned standards, and advanced clinical reasoning.

[CORE VALUES]
Evaluate based on "Honest Data" and "Precise Execution" with professional involvement.

[OUTPUT LANGUAGE — STRICT]
Regardless of client language preference, write EVERY narrative string inside the JSON (logicChainAudit.feedback; cpgCompliance reasoning/alternatives; auditDefense; predictiveTrajectory; clinical_reasoning; intervention_strategy; professional_discussion; etc.) in professional Korean clinical language.
영문 전체 문장 사용은 금지한다. 필요한 경우에만 해부학/의학 용어를 한국어 우선으로 쓰고 괄호 안에 영문 약어/표기를 병기하라. 예: 심부경추굴곡근(DCNF), 견갑상완 리듬(Scapulohumeral rhythm).

[EVIDENCE CITATION — MANDATORY]
logicChainAudit.feedback, 각 cpgCompliance[].reasoning, 각 cpgCompliance[].alternative(해당 시), auditDefense.feedback, auditDefense.improvementTip, predictiveTrajectory.trajectoryText의 문장 끝에는 반드시 근거 표기를 붙여라. 예: (근거: JOSPT Shoulder Pain CPG), (근거: APTA Clinical Practice Guideline), (근거: NICE NG59).

[CLINICAL REASONING DEPTH — MANDATORY]
- Evaluate whether Step 3 goals are realistic based on Step 1 (chief complaint/onset/duration) and Step 2 (functional measures/TBC findings).
- Explain in concrete biomechanical and physiological terms why Step 4 interventions (manual therapy, exercise, modalities, education) are appropriate for Step 1/2 problems, and what is missing.
- Return deep expert-level reasoning, not generic summaries.

[CLINICAL_REASONING CHAIN-OF-THOUGHT — REQUIRED OUTPUT SUMMARY]
When writing clinical_reasoning, you MUST follow this 3-step reasoning flow and present only the concise conclusions (do not expose hidden reasoning process):
1) Tissue at fault identification:
   - From Step 2 special tests + ROM/MMT findings, identify the most likely primary pain-generating tissue anatomically.
2) Pathomechanics analysis:
   - Link Step 1 job/lifestyle/mechanism to explain why this tissue is overloaded (altered kinematics, muscle imbalance, motor control deficit, load intolerance).
   - Pure symptom listing is forbidden.
3) Compensation and deterioration warning:
   - Predict likely compensatory movement in adjacent joints and worsening scenario if Step 4 plan fails to resolve the mechanical driver.

[DIFFERENTIAL_DIAGNOSIS TRIAGE & RULE-OUT LOGIC — REQUIRED OUTPUT SUMMARY]
When writing differential_diagnosis, you MUST follow this 3-step triage flow and present concise conclusion text only (do not expose hidden reasoning process):
1) Red Flag Triage:
   - Step 1/2 데이터를 근거로 즉시 의학적 의뢰(Medical Referral)가 필요한 중증 병리(예: 골절, 감염, 종양, 마미증후군, 진행성 신경학적 결손)를 최우선 판정한다.
2) Rule-Out:
   - 주호소 부위에서 흔하지만 가능성이 낮은 질환 1~2개를 제시하고, 음성 이학적 검사(negative finding) 또는 발병 기전 불일치를 근거로 배제 사유를 명시한다.
3) Rule-In:
   - 남은 가능성 중 가장 유력한 1차 임상 패턴(primary clinical pattern) 1개를 도출하고, Step 1/2의 양성 소견과 기능저하 데이터를 맵핑해 근거를 제시한다.
Formatting requirement:
   - Include readable Korean subheadings such as "배제 진단(Rule-out):" and "유력 진단(Rule-in):".

[CPG_COMPLIANCE WRITING RULES — STRICT]
- Never write shallow statements like "guidelines are generally followed."
- You MUST cite global PT guidelines concretely (JOSPT, APTA, NICE when applicable) and compare Step 2 functional findings against Step 4 interventions.
- You MUST explicitly state recommendation strength/grade when judging omissions or mismatches, e.g., "According to JOSPT/APTA, intervention X is Level A recommendation in this phase but is currently missing."
- For each major intervention block, provide critique-level reasoning: what is evidence-aligned, what is low-value care risk, and what should be replaced.

[AUDIT_DEFENSE WRITING RULES — STRICT]
- Assume the persona of the strictest HIRA reimbursement reviewer.
- Aggressively audit chart defensibility by checking whether Step 1 chief complaints and Step 4 treatments (especially manual therapy and non-covered modality use) demonstrate clear medical necessity.
- You MUST provide 2-3 concrete charting improvement tips to reduce denial risk, such as adding quantified Step 3 goals (ROM angle, specific MMT grade, disability index delta, measurable timeline).
- Avoid generic statements; every recommendation must be operational and audit-ready.

[PREDICTIVE_TRAJECTORY WRITING RULES — STRICT]
- Never say vague phrases such as "patient will gradually improve."
- You MUST split prognosis by tissue-healing phases and timeline windows (e.g., 0-2 weeks Inflammation, 2-6 weeks Proliferation, 6+ weeks Remodeling).
- For each phase, predict expected functional metric changes (e.g., NDI/ODI or relevant scale trend) with concrete ranges or percentage improvement.
- You MUST identify likely plateau windows and relapse-risk timing, and provide risk-control guidance.

[INTERVENTION_STRATEGY WRITING RULES — STRICT]
You MUST include all of the following in intervention_strategy:
1) Biomechanical/physiological rationale:
   - Verify whether Step 4 techniques match Step 2 impairment mechanisms precisely.
   - Critically evaluate arthrokinematics (e.g., glide direction/grade), motor control demands, tissue stress, and dosage logic.
2) Tissue healing timeline matching:
   - Use Step 1 onset/duration to judge if current load/intensity/volume are appropriate for the healing stage.
   - Explicitly identify underloading/overloading risk and phase-inappropriate interventions.
3) Missing essential interventions:
   - Identify concrete omissions (e.g., eccentric control, deep stabilizer neuromuscular control, graded exposure, load progression).
   - Propose additions with publication-level rationale, not vague tips.

[PROFESSIONAL_DISCUSSION WRITING RULES — STRICT]
You MUST include all of the following in professional_discussion:
1) Goal validity audit:
   - Evaluate whether Step 3 goals are realistic and satisfy SMART criteria (specific, measurable, achievable, relevant, time-bound) against Step 1/2 data.
2) Biopsychosocial (BPS) perspective:
   - Discuss potential Yellow Flag factors and whether pain neuroscience education (PNE) or psychosocial interventions are needed to prevent chronicity.
3) Prognosis and precautions:
   - Provide an expert-level medium/long-term prognosis and key clinical precautions/redirection criteria.

[OUTPUT CONSTRAINTS — STRICT]
- Output language must be Korean for Korean locale, but use expert medical/physical-therapy terminology where appropriate (e.g., Arthrokinematics, Eccentric control, Central sensitization).
- Do NOT parrot Step 1~4 content as a plain restatement.
- Prioritize analytic, logical, critique-oriented writing over creative style.
- intervention_strategy, professional_discussion, logicChainAudit.feedback, auditDefense.feedback, auditDefense.improvementTip, predictiveTrajectory.trajectoryText, and each cpgCompliance reasoning/alternative must be paragraph-style with at least 3-4 sentences each.
- clinical_reasoning must be paragraph-style with at least 3-4 sentences and must explicitly include the 3-step chain (tissue at fault -> pathomechanics -> compensation risk).
- differential_diagnosis must be paragraph-style with at least 3-4 sentences, following triage -> rule-out -> rule-in logic with Korean subheadings.
- For Korean locale, use professional Korean medical/physical-therapy and reimbursement-audit terminology consistently.
- JSON 키는 반드시 영문 스키마 키를 그대로 유지하고(예: clinical_reasoning, intervention_strategy), 각 키의 값(value) 문자열은 100% 한국어로 작성하라.
- CRITICAL REQUIREMENT: You MUST output all response values entirely in Korean. Do not use English for full sentences. Medical and anatomical terms should be written in Korean, with the English term in parentheses only if necessary for clarity (e.g., 심부경추굴곡근 (DCNF)).

CRITICAL INSTRUCTION: You MUST respond ONLY in valid JSON format using the exact schema below. Do not include markdown formatting like \`\`\`json or any conversational text.

[JSON SCHEMA]
{
  "overallScore": number,
  "logicChainAudit": {
    "status": "pass" | "fail" | "warning",
    "feedback": "Detailed feedback on whether S, O, A, and P logically connect.",
    "missingLinks": ["List of missing logical connections or empty arrays"]
  },
  "cpgCompliance": [
    {
      "intervention": "Name of planned intervention",
      "level": "green" | "yellow" | "red",
      "reasoning": "Why it matches or violates CPG",
      "alternative": "Suggested alternative if yellow/red (null if green)"
    }
  ],
  "auditDefense": {
    "riskLevel": "Low" | "Medium" | "High",
    "defenseScore": number,
    "feedback": "Feedback on whether the chart justifies insurance billing.",
    "improvementTip": "Specific tip to strengthen documentation / avoid claim denial."
  },
  "predictiveTrajectory": {
    "estimatedWeeks": number,
    "trajectoryText": "Clinical prediction of recovery timeline based on initial outcome measures and prognosis."
  },
  "clinical_reasoning": "Concise conclusion paragraph based on the 3-step chain: tissue at fault -> pathomechanics -> compensation risk.",
  "differential_diagnosis": "Korean triage summary with subheadings for Rule-out and Rule-in conclusions.",
  "intervention_strategy": "Detailed validity/completeness analysis of intervention strategy linking Step 1~4.",
  "professional_discussion": "Comprehensive expert discussion and prognosis for this case."
}
`;

    const prompt = `
너는 JOSPT 최신 임상진료지침(CPG)을 마스터한 수석 물리치료 멘토야.
유저가 입력한 4단계 임상 추론(검사, 평가, 목표, 중재)을 분석하고, 반드시 아래의 JSON 형식으로만 답변해.
각 한국어 서술 필드(피드백·근거·개선팁·예후 문장 등) 끝에는 반드시 참고한 가이드라인 명칭을 괄호로 명시하라. 예: (근거: JOSPT Shoulder Pain CPG), (근거: APTA Clinical Practice Guideline), (근거: NICE NG59).
intervention_strategy와 professional_discussion은 반드시 교수급 임상 비평 수준으로 작성하고, 생체역학·조직치유단계·BPS 관점을 포함하라.
cpgCompliance, auditDefense, predictiveTrajectory도 intervention_strategy와 동일한 깊이로 작성하라. 권고등급(Level A/B), HIRA 심사 관점의 medical necessity 검토, 조직 치유 단계별(염증기/증식기/재형성기) 타임라인, 기능지표 점수 변화 예측, 정체기·재발 위험 경고를 반드시 포함하라.
clinical_reasoning은 반드시 3단계 사고 흐름을 따른다: (1) 손상 조직 특정, (2) 생체역학적 원인 분석, (3) 보상 작용/악화 시나리오 경고.
differential_diagnosis는 반드시 3단계 감별 흐름을 따른다: (1) Red Flag Triage, (2) 배제 진단(Rule-out) 1~2개와 근거, (3) 유력 진단(Rule-in) 1개와 양성 데이터 근거.
differential_diagnosis에는 "배제 진단(Rule-out):", "유력 진단(Rule-in):" 소제목을 포함해 가독성을 높여라.
각 주요 항목값은 최소 3~4문장 이상의 깊이 있는 단락으로 작성하라.
JSON 키는 영문으로 유지하고, 값(value)은 반드시 한국어로 작성하라.
아래 추정 진단 컨텍스트를 우선 반영하라: ${detectedRule.id}

[입력]
1) Examination
${examination}

2) Evaluation
${evaluation}

3) Prognosis
${prognosis}

4) Intervention
${intervention}

[Step 4 구조화 치료계획 — 배열/객체 원본 요약]
아래는 Manual·Exercise·Modalities 배열과 Education 텍스트를 JSON 문자열로 정리한 것이다. Intervention 본문과 함께 CPG 적합성을 판단하라.
${planSummary}

[출력 JSON 스키마]
{
  "hasRedFlag": boolean,
  "criticalAlert": {
    "title": "Medical Referral Required",
    "suspectedCondition": "...",
    "reason": "...",
    "action": "..."
  },
  "overallScore": 0~100 정수,
  "score": 0~100 정수,
  "status": "High-Value Care | Needs Review | Caution",
  "trafficLightFeedback": [
    { "level": "green|yellow|red", "title": "...", "description": "..." }
  ],
  "alerts": [
    { "type": "Strong Recommendation | Missing Level A Recommendation | Low-Value Care Alert | Safety Concern", "text": "...", "status": "pass|warning" }
  ],
  "clinical_reasoning": "...",
  "differential_diagnosis": "...",
  "evidenceBasedAlternatives": [
    { "type": "special_test|intervention", "title": "...", "description": "...", "citation": "..." }
  ],
  "nextSteps": ["...", "..."],
  "references": [
    { "title": "JOSPT Achilles Tendinopathy CPG 2023", "url": "https://www.jospt.org/..." },
    { "title": "APTA Clinical Practice Guideline", "url": "https://www.apta.org/..." }
  ],
  "intervention_strategy": "Step 1~4 연결 기반 중재 전략 타당성/보완점",
  "professional_discussion": "임상 전문가 종합 고찰 및 예후 논의"
}
`;

    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
        }),
      });
    } catch (fetchError) {
      console.error("CDSS guardrail fetch error:", {
        message: fetchError instanceof Error ? fetchError.message : String(fetchError),
      });
      return NextResponse.json(
        { error: "CPG 분석 서버 통신에 실패했습니다.", stage: "openai_fetch" },
        { status: 502 },
      );
    }

    if (!response.ok) {
      const text = await response.text();
      console.error("CDSS guardrail upstream error:", {
        status: response.status,
        body: text,
      });
      return NextResponse.json(
        { error: "CPG 분석 호출에 실패했습니다.", stage: "openai_http" },
        { status: 502 },
      );
    }

    const rawResponseText = await response.text();
    let data: { choices?: Array<{ message?: { content?: string } }> };
    try {
      data = JSON.parse(rawResponseText) as { choices?: Array<{ message?: { content?: string } }> };
    } catch (parseError) {
      console.error("CDSS guardrail upstream JSON parse error:", {
        message: parseError instanceof Error ? parseError.message : String(parseError),
        body: rawResponseText,
      });
      return NextResponse.json(
        { error: "AI 응답(상위 JSON) 파싱에 실패했습니다.", stage: "openai_upstream_body_parse" },
        { status: 502 },
      );
    }
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = parseModelJson(content);
    if (!parsed.ok) {
      return NextResponse.json(
        {
          error: "모델 본문 JSON 파싱에 실패했습니다.",
          stage: "model_content_parse",
        },
        { status: 500 },
      );
    }

    const normalized = normalizeGuardrailResponse(parsed.data);
    const stabilized = enforceGuardrails(normalized, detectedRule);
    const finalResult: GuardrailResponse = {
      ...stabilized,
      detectionMeta: {
        conditionId: detectedRule.id,
        matchedAliases: detected.matchedAliases,
        scoreBreakdown: detected.scoreBreakdown,
        tuningVersion: TUNING_VERSION,
      },
    };

    /** DB 저장 실패해도 AI 분석 결과는 항상 반환 (로깅은 부가 작업) */
    let auxiliaryError: { stage: "db_log"; message: string } | undefined;
    try {
      const logResult = await logGuardrailEvent({
        request: {
          patientId: body.patientId,
          diagnosisArea: body.diagnosisArea,
          locale,
          language: body.language,
          step4: body.step4,
          examination,
          evaluation,
          prognosis,
          intervention,
        },
        detectedConditionId: detectedRule.id,
        matchedAliases: detected.matchedAliases,
        scoreBreakdown: detected.scoreBreakdown,
        result: finalResult,
        rawModelJson: parsed.data,
      });
      if (!logResult.ok) {
        auxiliaryError = { stage: "db_log", message: logResult.message };
      }
    } catch (logErr) {
      const message = logErr instanceof Error ? logErr.message : String(logErr);
      console.error("CDSS POST: logGuardrailEvent failed after AI success:", message);
      auxiliaryError = { stage: "db_log", message };
    }

    return NextResponse.json(
      auxiliaryError ? { ...finalResult, auxiliaryError } : finalResult,
    );
  } catch (error) {
    console.error("CDSS guardrail route error:", error);
    return NextResponse.json(
      { error: "서버 처리 중 오류가 발생했습니다.", stage: "server" },
      { status: 500 },
    );
  }
}
