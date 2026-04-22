import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SaveRequest = {
  patientId?: string;
  diagnosisArea?: string;
  locale?: string;
  language?: string;
  result?: {
    overallScore?: number;
    complianceScore?: number;
    hasRedFlag?: boolean;
    detectionMeta?: {
      conditionId?: string;
      matchedAliases?: string[];
      scoreBreakdown?: Record<string, number>;
    };
    logicChainAudit?: unknown;
    cpgCompliance?: unknown;
    auditDefense?: unknown;
    predictiveTrajectory?: unknown;
    differentialDiagnosis?: string;
    differential_diagnosis?: string;
  };
};

const TABLE = "cdss_guardrail_logs";
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
  "intervention_strategy",
  "professional_discussion",
  "score_breakdown",
  "raw_ai_response",
] as const;
const ALLOWED_COLUMN_SET = new Set<string>(ALLOWED_COLUMNS);

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function clampScore(v: unknown) {
  if (typeof v !== "number" || !Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function sanitizeInsertPayload(row: Record<string, unknown>, aiResult: unknown) {
  const sanitizedPayload: Record<string, unknown> = {};
  const droppedRowKeys: Record<string, unknown> = {};
  const aiUnknownFields: Record<string, unknown> = {};
  const aiObj = aiResult && typeof aiResult === "object" ? (aiResult as Record<string, unknown>) : {};

  for (const [key, value] of Object.entries(row)) {
    if (ALLOWED_COLUMN_SET.has(key)) sanitizedPayload[key] = value;
    else droppedRowKeys[key] = value;
  }
  for (const [key, value] of Object.entries(aiObj)) {
    if (!ALLOWED_COLUMN_SET.has(key)) {
      aiUnknownFields[key] = value;
    }
  }

  sanitizedPayload.raw_ai_response = {
    source: "manual_save_button",
    allowed_columns: ALLOWED_COLUMNS,
    dropped_row_keys: droppedRowKeys,
    unknown_ai_fields: aiUnknownFields,
    result: aiResult,
  };
  return sanitizedPayload;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SaveRequest;
    const patientId = String(body.patientId ?? "").trim();
    console.log("[cdss-guardrail/save] incoming patientId:", body.patientId, "normalized:", patientId);
    if (!patientId) {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    }
    const result = body.result ?? {};
    const overallScore = clampScore(result.overallScore ?? result.complianceScore ?? 0);
    const hasRedFlag = Boolean(result.hasRedFlag);
    const detectedConditionId =
      typeof result.detectionMeta?.conditionId === "string" ? result.detectionMeta.conditionId : null;

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "supabase admin not configured" }, { status: 500 });
    }

    const row: Record<string, unknown> = {
      patient_id: patientId,
      diagnosis_area: typeof body.diagnosisArea === "string" ? body.diagnosisArea : null,
      overall_score: overallScore,
      clinical_reasoning:
        typeof (result as { clinicalReasoning?: unknown; clinical_reasoning?: unknown }).clinicalReasoning === "string"
          ? (result as { clinicalReasoning?: string }).clinicalReasoning
          : typeof (result as { clinical_reasoning?: unknown }).clinical_reasoning === "string"
            ? (result as { clinical_reasoning?: string }).clinical_reasoning
            : "",
      differential_diagnosis:
        typeof (result as { differentialDiagnosis?: unknown; differential_diagnosis?: unknown }).differentialDiagnosis ===
          "string"
          ? (result as { differentialDiagnosis?: string }).differentialDiagnosis
          : typeof (result as { differential_diagnosis?: unknown }).differential_diagnosis === "string"
            ? (result as { differential_diagnosis?: string }).differential_diagnosis
            : "",
      logic_audit: result.logicChainAudit ?? null,
      cpg_compliance: result.cpgCompliance ?? null,
      audit_defense: result.auditDefense ?? null,
      predictive_trajectory: result.predictiveTrajectory ?? null,
      compliance_score: clampScore(result.complianceScore ?? result.overallScore ?? 0),
      detected_condition_id: detectedConditionId,
      has_red_flag: hasRedFlag,
      matched_aliases: Array.isArray(result.detectionMeta?.matchedAliases) ? result.detectionMeta?.matchedAliases : [],
      score_breakdown:
        result.detectionMeta?.scoreBreakdown && typeof result.detectionMeta.scoreBreakdown === "object"
          ? result.detectionMeta.scoreBreakdown
          : {},
      intervention_strategy:
        typeof (result as { interventionStrategy?: unknown; intervention_strategy?: unknown }).interventionStrategy === "string"
          ? (result as { interventionStrategy?: string }).interventionStrategy
          : typeof (result as { intervention_strategy?: unknown }).intervention_strategy === "string"
            ? (result as { intervention_strategy?: string }).intervention_strategy
            : "",
      professional_discussion:
        typeof (result as { professionalDiscussion?: unknown; professional_discussion?: unknown }).professionalDiscussion === "string"
          ? (result as { professionalDiscussion?: string }).professionalDiscussion
          : typeof (result as { professional_discussion?: unknown }).professional_discussion === "string"
            ? (result as { professional_discussion?: string }).professional_discussion
            : "",
    };

    const aiResultForBackup = {
      ...result,
      locale: body.locale ?? null,
      language: body.language ?? null,
    };
    const sanitizedPayload = sanitizeInsertPayload(row, aiResultForBackup);
    console.log("[cdss-guardrail/save] inserting row patient_id:", row.patient_id);
    const { error } = await supabase.from(TABLE).insert(sanitizedPayload as never);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown error" },
      { status: 500 },
    );
  }
}
