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
  if (!patientId || patientId === "null" || patientId === "undefined") {
    return { rows: [], error: { message: "invalid chartPatientId" } };
  }

  const { data, error } = await supabase
    .from("cdss_guardrail_logs")
    .select("id, created_at, overall_score, has_red_flag, detected_condition_id, diagnosis_area, logic_audit, payload")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (error) {
    return { rows: [], error: { message: error.message } };
  }

  const timelineData = (data ?? []) as Array<Omit<CdssGuardrailTimelineRow, "payload"> & { payload?: unknown }>;
  const rows: CdssGuardrailTimelineRow[] = timelineData.map((row) => ({
    ...row,
    payload: row.payload && typeof row.payload === "object" ? (row.payload as Record<string, unknown>) : null,
  }));

  return { rows, error: null };
}
