import type { SupabaseClient } from "@supabase/supabase-js";

/** cdss_guardrail_logs 타임라인 조회용 최소 행 타입 (차트 UI와 동일 스키마) */
export type CdssGuardrailTimelineRow = {
  id: string;
  created_at: string;
  overall_score: number | null;
  has_red_flag: boolean | null;
  detected_condition_id: string | null;
  diagnosis_area: string | null;
  logic_audit: unknown;
  payload: Record<string, unknown> | null;
};

/**
 * URL·저장 payload와 동일한 patient_id로 cdss_guardrail_logs를 조회한다.
 * chartPatientId는 decodeURIComponent + trim 처리된 단일 진실 공급원 값이어야 한다.
 */
export async function fetchCdssTimelineRows(
  supabase: SupabaseClient,
  chartPatientId: string,
): Promise<{ rows: CdssGuardrailTimelineRow[]; error: { message: string } | null }> {
  const patientId = String(chartPatientId ?? "").trim();
  const cleanPatientId = patientId.toLowerCase().trim();
  if (!cleanPatientId || cleanPatientId === "null" || cleanPatientId === "undefined") {
    return { rows: [], error: { message: "invalid chartPatientId" } };
  }
  console.log("🔍 [Fetch] 원본 환자 ID:", patientId);
  console.log("🔍 [Fetch] 정제된 환자 ID:", cleanPatientId);

  const { data, error } = await supabase
    .from("cdss_guardrail_logs")
    .select("id, created_at, overall_score, has_red_flag, detected_condition_id, diagnosis_area, logic_audit, raw_ai_response")
    .eq("patient_id", cleanPatientId)
    .order("created_at", { ascending: false });

  if (error) {
    return { rows: [], error: { message: error.message } };
  }

  const timelineData = (data ?? []) as Array<
    Omit<CdssGuardrailTimelineRow, "payload"> & { raw_ai_response?: unknown }
  >;
  const rows: CdssGuardrailTimelineRow[] = timelineData.map((row) => ({
    ...row,
    payload:
      row.raw_ai_response && typeof row.raw_ai_response === "object"
        ? (row.raw_ai_response as Record<string, unknown>)
        : null,
  }));

  return { rows, error: null };
}
