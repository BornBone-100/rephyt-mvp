import type { SupabaseClient } from "@supabase/supabase-js";

type FinalizeSoapAuditInput = {
  supabase: SupabaseClient;
  patientId: string;
  originalAiOutput: string;
  finalTherapistDecision: string;
  metrics: unknown;
};

/**
 * AI 출력 ↔ 치료사 최종 결정 차이를 감사 로그(`soap_history`)로 저장합니다.
 * 우선순위 5: drift 모니터링/개선 KPI 추출용.
 */
export async function finalizeSoapAuditLog(input: FinalizeSoapAuditInput): Promise<void> {
  const driftDetected = input.originalAiOutput.trim() !== input.finalTherapistDecision.trim();

  const payload = {
    patient_id: input.patientId,
    original_ai_output: input.originalAiOutput,
    final_therapist_decision: input.finalTherapistDecision,
    is_modified: driftDetected,
    metrics: input.metrics,
    timestamp: new Date().toISOString(),
  };

  const { error } = await input.supabase.from("soap_history").insert(payload);
  if (error) throw error;
}
