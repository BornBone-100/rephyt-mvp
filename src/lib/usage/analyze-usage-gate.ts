import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/utils/supabase/server";

/** 서비스 롤 등 DB 제네릭이 연결되지 않은 클라이언트와의 호환용 (createClient 반환 간 제네릭 불일치 방지) */
export type UsageGateSupabaseAdmin = SupabaseClient<any, "public", "public", any, any>;

export const FREE_TIER_MONTHLY_ANALYZE_LIMIT = 5;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/** 서울 달력 기준 이번 달 [시작, 다음 달 1일 0시) — timestamptz 비교용 ISO 문자열 (보조·테스트용) */
export function getSeoulMonthRangeIso(): { startInclusive: string; endExclusive: string } {
  const tz = "Asia/Seoul";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === "year")?.value ?? "1970");
  const mo = Number(parts.find((p) => p.type === "month")?.value ?? "1");
  const pad = (n: number) => String(n).padStart(2, "0");
  const startInclusive = `${y}-${pad(mo)}-01T00:00:00+09:00`;
  const ny = mo === 12 ? y + 1 : y;
  const nm = mo === 12 ? 1 : mo + 1;
  const endExclusive = `${ny}-${pad(nm)}-01T00:00:00+09:00`;
  return { startInclusive, endExclusive };
}

export type PlanTier = "free" | "pro";

function normalizePlanTier(raw: string | null | undefined): PlanTier {
  if (!raw) return "free";
  const v = raw.trim().toLowerCase();
  if (v === "pro" || v === "paid" || v === "enterprise" || v === "trial") return "pro";
  return "free";
}

/** profiles.plan_type 우선, 없으면 plan_tier로 유료 여부 추정 */
export async function fetchProfilePlan(
  admin: UsageGateSupabaseAdmin,
  userId: string,
): Promise<{ planType: string | null; planTier: string | null }> {
  const { data, error } = await admin.from("profiles").select("plan_type, plan_tier").eq("id", userId).maybeSingle();
  if (error || !data) return { planType: null, planTier: null };
  const row = data as { plan_type?: string | null; plan_tier?: string | null };
  return {
    planType: typeof row.plan_type === "string" ? row.plan_type : null,
    planTier: typeof row.plan_tier === "string" ? row.plan_tier : null,
  };
}

/**
 * 무제한(과금 장벽 없음) 플랜인지.
 * - plan_type이 pro/paid/enterprise/trial 이면 무제한
 * - plan_type이 비어 있으면 plan_tier가 pro 계열이면 무제한
 */
export function isUnlimitedPlan(planType: string | null, planTier: string | null): boolean {
  const pt = planType?.trim().toLowerCase();
  if (pt && ["pro", "paid", "enterprise", "trial"].includes(pt)) return true;
  if (pt === "free") return false;
  return normalizePlanTier(planTier) === "pro";
}

/**
 * 이번 달 리포트 생성 횟수 — Supabase RPC `get_monthly_report_count(p_user_id)`.
 * RPC 미배포·오류 시 0을 반환하고 콘솔에만 기록(개발 중 단절 방지).
 */
export async function getMonthlyReportCountFromRpc(
  admin: UsageGateSupabaseAdmin,
  userId: string,
): Promise<number> {
  const { data, error } = await admin.rpc("get_monthly_report_count", { p_user_id: userId });
  if (error) {
    console.error("[get_monthly_report_count RPC]", error.message, error.code, error.details);
    return 0;
  }
  if (typeof data === "number" && Number.isFinite(data)) return Math.max(0, data);
  if (typeof data === "string" && /^\d+$/.test(data)) return Math.max(0, parseInt(data, 10));
  return 0;
}

export type MonthlyUsageSnapshot = {
  planType: string | null;
  planTier: string | null;
  plan: PlanTier;
  /** RPC 기준 이번 달 리포트(로그) 건수 */
  reportCount: number;
  /** 하위 호환: reportCount와 동일 */
  logCount: number;
  distinctPatientCount: number;
  limit: number;
  allowed: boolean;
};

export async function checkMonthlyUsage(admin: UsageGateSupabaseAdmin, userId: string): Promise<MonthlyUsageSnapshot> {
  const { planType, planTier } = await fetchProfilePlan(admin, userId);
  const unlimited = isUnlimitedPlan(planType, planTier);
  const plan: PlanTier = unlimited ? "pro" : "free";

  if (unlimited) {
    return {
      planType,
      planTier,
      plan,
      reportCount: 0,
      logCount: 0,
      distinctPatientCount: 0,
      limit: FREE_TIER_MONTHLY_ANALYZE_LIMIT,
      allowed: true,
    };
  }

  const reportCount = await getMonthlyReportCountFromRpc(admin, userId);
  const allowed = reportCount < FREE_TIER_MONTHLY_ANALYZE_LIMIT;

  return {
    planType,
    planTier,
    plan,
    reportCount,
    logCount: reportCount,
    distinctPatientCount: reportCount,
    limit: FREE_TIER_MONTHLY_ANALYZE_LIMIT,
    allowed,
  };
}

export async function gateAnalyzeRequest(): Promise<
  | { ok: true; userId: string; snapshot: MonthlyUsageSnapshot }
  | { ok: false; response: NextResponse }
> {
  const authClient = await createServerSupabase();
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();
  if (authError || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized", requiresUpgrade: false },
        { status: 401 },
      ),
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: true,
      userId: user.id,
      snapshot: {
        planType: null,
        planTier: null,
        plan: "free",
        reportCount: 0,
        logCount: 0,
        distinctPatientCount: 0,
        limit: FREE_TIER_MONTHLY_ANALYZE_LIMIT,
        allowed: true,
      },
    };
  }

  const snapshot = await checkMonthlyUsage(admin, user.id);
  if (!snapshot.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Usage limit exceeded", requiresUpgrade: true },
        { status: 403 },
      ),
    };
  }

  return { ok: true, userId: user.id, snapshot };
}
