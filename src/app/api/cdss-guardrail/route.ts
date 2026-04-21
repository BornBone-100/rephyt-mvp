import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type GuardrailRequest = {
  examination?: string;
  evaluation?: string;
  prognosis?: string;
  intervention?: string;
};

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

function parseModelJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const matched = content.match(/\{[\s\S]*\}/);
    if (!matched) return {};
    try {
      return JSON.parse(matched[0]);
    } catch {
      return {};
    }
  }
}

function normalizeGuardrailResponse(raw: unknown): GuardrailResponse {
  const data = (raw ?? {}) as Partial<GuardrailResponse> & {
    score?: number;
    alerts?: Array<{ type?: string; text?: string; status?: string }>;
    reasoning?: string;
  };
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
      typeof (data.complianceScore ?? data.score) === "number" && Number.isFinite(data.complianceScore ?? data.score)
        ? Math.max(0, Math.min(100, Math.round((data.complianceScore ?? data.score) as number)))
        : 0,
    status: typeof data.status === "string" && data.status.trim() ? data.status : "Needs Review",
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
      : [],
    clinicalReasoning:
      typeof (data.clinicalReasoning ?? data.reasoning) === "string" && (data.clinicalReasoning ?? data.reasoning)?.trim()
        ? (data.clinicalReasoning ?? data.reasoning) as string
        : "입력된 임상 정보를 기반으로 추가 검토가 필요합니다.",
    nextSteps: Array.isArray(data.nextSteps) ? data.nextSteps.filter((x): x is string => typeof x === "string") : [],
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
      : [],
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

async function logGuardrailEvent(params: {
  request: GuardrailRequest;
  detectedConditionId: string;
  matchedAliases: string[];
  scoreBreakdown: Record<string, number>;
  result: GuardrailResponse;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  try {
    await supabase.from("cdss_guardrail_logs").insert({
      payload: params.request,
      detected_condition_id: params.detectedConditionId,
      matched_aliases: params.matchedAliases,
      score_breakdown: params.scoreBreakdown,
      has_red_flag: params.result.hasRedFlag,
      status: params.result.status,
      compliance_score: params.result.complianceScore,
      tuning_version: TUNING_VERSION,
    });
  } catch {
    // noop: logging should never block response
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GuardrailRequest;
    const examination = (body.examination ?? "").trim();
    const evaluation = (body.evaluation ?? "").trim();
    const prognosis = (body.prognosis ?? "").trim();
    const intervention = (body.intervention ?? "").trim();

    if (!examination || !evaluation || !prognosis || !intervention) {
      return NextResponse.json({ error: "모든 단계 입력이 필요합니다." }, { status: 400 });
    }
    const fullInput = `${examination}\n${evaluation}\n${prognosis}\n${intervention}`;
    const tuningMap = await loadAliasTuningMap();
    const detected = detectConditionRule(evaluation, fullInput, tuningMap);
    const detectedRule = detected.rule;

    const systemPrompt = `
너는 전 세계에서 가장 정교한 물리치료 임상 의사결정 지원 엔진이자, 직접 접근(Direct Access) 환경에서 환자를 스크리닝하는 1차 의료 전문가야.

[최우선 임무: Red Flag 스크리닝]
유저가 입력한 4단계(특히 1단계 Examination의 주소증 및 통증 양상)를 분석하여, 해당 통증이 근골격계 문제가 아닐 가능성(예: 내장기 기원의 연관통, 종양, 감염, 골절 등)이 1%라도 의심된다면, 일반적인 CPG 평가를 중단하고 즉시 Medical Referral 경고를 발동하라.

[분석 지침]
1) 통증이 역학적(기계적 움직임이나 자세)으로 재현되지 않는 경우.
2) 야간통, 식후 통증, 원인 불명의 체중 감소 등 Systemic symptom이 동반된 경우.
3) 위 조건에 해당하면 hasRedFlag를 true로 설정하고, 의심되는 내과적 질환명과 의뢰해야 할 진료과를 명시하라.
4) 반드시 JSON만 출력하라.
`;

    const prompt = `
너는 JOSPT 최신 임상진료지침(CPG)을 마스터한 수석 물리치료 멘토야.
유저가 입력한 4단계 임상 추론(검사, 평가, 목표, 중재)을 분석하고, 반드시 아래의 JSON 형식으로만 답변해.
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
  "reasoning": "...",
  "evidenceBasedAlternatives": [
    { "type": "special_test|intervention", "title": "...", "description": "...", "citation": "..." }
  ],
  "nextSteps": ["...", "..."],
  "references": [
    { "title": "JOSPT Achilles Tendinopathy CPG 2023", "url": "https://www.jospt.org/..." },
    { "title": "APTA Clinical Practice Guideline", "url": "https://www.apta.org/..." }
  ]
}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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

    if (!response.ok) {
      const text = await response.text();
      console.error("CDSS guardrail upstream error:", text);
      return NextResponse.json({ error: "CPG 분석 호출에 실패했습니다." }, { status: 502 });
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = parseModelJson(content);

    const normalized = normalizeGuardrailResponse(parsed);
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

    await logGuardrailEvent({
      request: { examination, evaluation, prognosis, intervention },
      detectedConditionId: detectedRule.id,
      matchedAliases: detected.matchedAliases,
      scoreBreakdown: detected.scoreBreakdown,
      result: finalResult,
    });

    return NextResponse.json(finalResult);
  } catch (error) {
    console.error("CDSS guardrail route error:", error);
    return NextResponse.json({ error: "서버 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
