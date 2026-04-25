type JsonRecord = Record<string, unknown>;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function asRecord(v: unknown): JsonRecord | null {
  if (v != null && typeof v === "object" && !Array.isArray(v)) return v as JsonRecord;
  return null;
}

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string" && v.trim() !== "") return v;
  return undefined;
}

/**
 * `profiles` 행(Select *)에서 구독·경력·활성 여부를 읽을 때,
 * generated 타입과 실제 DB 컬럼명이 어긋나도 `metadata` JSON을 보조로 씁니다.
 *
 * 비즈니스 규칙(원장님 스펙):
 * - isMaster: (years_of_experience || 0) >= 10
 * - currentPlan: subscription_plan || plan_type || 'free'
 * - isActive: plan_tier === 'active'
 */
export function rephytProfileSyncFromRow(profile: JsonRecord | null) {
  const p = profile;
  const meta = asRecord(p?.metadata);
  const years = num(
    p?.years_of_experience ?? meta?.years_of_experience,
  );
  const isMaster = (years || 0) >= 10;
  const currentPlan =
    str(p?.subscription_plan) ||
    str(meta?.subscription_plan) ||
    str(p?.plan_type) ||
    str(meta?.plan_type) ||
    "free";
  const isActive = str(p?.plan_tier) === "active";
  return {
    isMaster,
    currentPlan,
    isActive,
    yearsOfExperience: years,
  };
}
