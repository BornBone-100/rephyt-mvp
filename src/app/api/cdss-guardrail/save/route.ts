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
  };
};

const TABLE = "cdss_guardrail_logs";

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

    const row = {
      patient_id: patientId,
      diagnosis_area: typeof body.diagnosisArea === "string" ? body.diagnosisArea : null,
      overall_score: overallScore,
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
      raw_ai_response: {
        source: "manual_save_button",
        locale: body.locale ?? null,
        language: body.language ?? null,
        result,
      },
    };

    console.log("[cdss-guardrail/save] inserting row patient_id:", row.patient_id);
    const { error } = await supabase.from(TABLE).insert(row as never);
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
