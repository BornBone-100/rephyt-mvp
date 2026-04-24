import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { calculateDefenseScore } from "@/lib/clinical/calculate-defense-score";
import {
  calculateRecoveryPrognosis,
  recoveryScoreToWeeksHint,
} from "@/lib/clinical/calculate-recovery-prognosis";

type SaveRequest = {
  reportId?: string;
  patientId?: string;
  userId?: string;
  authorId?: string;
  author_id?: string;
  diagnosisArea?: string;
  locale?: string;
  language?: string;
  originalData?: Record<string, unknown>;
  assessmentData?: Record<string, unknown>;
  rom_assessment?: Record<string, unknown> | null;
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
  "id",
  "patient_id",
  "user_id",
  "author_id",
  "diagnosis_area",
  "overall_score",
  "clinical_reasoning",
  "differential_diagnosis",
  "logic_audit",
  "cpg_compliance",
  "audit_defense",
  "predictive_trajectory",
  "compliance_score",
  "defense_score",
  "recovery_score",
  "recovery_timeframe",
  "detected_condition_id",
  "has_red_flag",
  "matched_aliases",
  "intervention_strategy",
  "professional_discussion",
  "score_breakdown",
  "assessment_data",
  "original_data",
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

function normalizePatientId(raw: unknown) {
  return String(raw ?? "").trim().toLowerCase();
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function ensureUuid(raw: unknown) {
  const value = String(raw ?? "").trim();
  return UUID_REGEX.test(value) ? value : randomUUID();
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

async function logClinicalFilterActivity(
  supabase: any,
  payload: {
    userId: string | null;
    patientId: string;
    reportId: string;
    diagnosisArea: string | null;
    clinicalReasoning: string;
  },
) {
  const description = `${payload.diagnosisArea ?? "미분류"} | ${
    payload.clinicalReasoning.trim().slice(0, 140) || "주요 소견 요약 없음"
  }`;
  const row = {
    user_id: payload.userId,
    patient_id: payload.patientId,
    report_id: payload.reportId,
    activity_type: "CLINICAL_FILTER_REPORT",
    title: "PRACTICE SAFETY & CLINICAL FILTER 리포트 생성",
    description,
    metadata: { report_id: payload.reportId, patient_id: payload.patientId },
  };
  const upsertRes = await supabase.from("patient_activities").upsert(row as never, { onConflict: "report_id" });
  if (!upsertRes.error) {
    return row;
  }
  await supabase.from("user_logs").insert(row as never);
  return row;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SaveRequest;
    const patientId = ensureUuid(normalizePatientId(body.patientId));
    const reportId = ensureUuid(body.reportId);
    console.log("🕵️‍♂️ [디버깅] 백엔드가 전달받은 userId:", body.userId);
    const userId = String(body.userId ?? "").trim();
    const authorId = String(body.authorId ?? body.author_id ?? "").trim();
    const actorId = authorId || userId;
    console.log("[cdss-guardrail/save] incoming patientId:", body.patientId, "normalized:", patientId);
    if (!actorId) {
      return NextResponse.json({ error: "userId or authorId is required" }, { status: 401 });
    }
    const result = body.result ?? {};

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "supabase admin not configured" }, { status: 500 });
    }

    const safeInsertRow = {
      id: reportId,
      patient_id: patientId || null,
      diagnosis_area: typeof body.diagnosisArea === "string" ? body.diagnosisArea : null,
      overall_score: clampScore(result.overallScore ?? result.complianceScore ?? 0),
      clinical_reasoning:
        typeof (result as { clinicalReasoning?: unknown; clinical_reasoning?: unknown }).clinicalReasoning === "string"
          ? (result as { clinicalReasoning?: string }).clinicalReasoning
          : typeof (result as { clinical_reasoning?: unknown }).clinical_reasoning === "string"
            ? (result as { clinical_reasoning?: string }).clinical_reasoning
            : "",
      has_red_flag: Boolean(result.hasRedFlag),
      raw_ai_response: {
        author_id: body.authorId ?? body.author_id ?? null,
        full_request: body,
        full_result: result,
        model_json: result,
        score_breakdown:
          result.detectionMeta?.scoreBreakdown && typeof result.detectionMeta.scoreBreakdown === "object"
            ? result.detectionMeta.scoreBreakdown
            : {},
        matched_aliases: Array.isArray(result.detectionMeta?.matchedAliases) ? result.detectionMeta.matchedAliases : [],
      },
    };
    console.log("[cdss-guardrail/save] inserting safe row id:", safeInsertRow.id, "patient_id:", safeInsertRow.patient_id);
    const { error } = await supabase.from(TABLE).insert(safeInsertRow as never);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const activity = await logClinicalFilterActivity(supabase, {
      userId: actorId,
      patientId,
      reportId,
      diagnosisArea: typeof body.diagnosisArea === "string" ? body.diagnosisArea : null,
      clinicalReasoning:
        typeof safeInsertRow.clinical_reasoning === "string" ? safeInsertRow.clinical_reasoning : "",
    });
    return NextResponse.json({
      ok: true,
      activity: {
        id: reportId,
        type: "report",
        createdAt: new Date().toISOString(),
        title: activity.title,
        description: activity.description,
        metadata: activity.metadata,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown error" },
      { status: 500 },
    );
  }
}
