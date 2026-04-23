import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/utils/supabase/server";
import { checkMonthlyUsage, FREE_TIER_MONTHLY_ANALYZE_LIMIT } from "@/lib/usage/analyze-usage-gate";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/** 로그인 유저의 이번 달 CDSS 로그 사용량(프리미엄 게이트 프리뷰) */
export async function GET() {
  const authClient = await createServerSupabase();
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({
      planType: null,
      plan: "free",
      reportCount: 0,
      logCount: 0,
      distinctPatientCount: 0,
      limit: FREE_TIER_MONTHLY_ANALYZE_LIMIT,
      allowed: true,
      note: "admin client unavailable",
    });
  }

  const snapshot = await checkMonthlyUsage(admin, user.id);
  return NextResponse.json({
    planType: snapshot.planType,
    planTier: snapshot.planTier,
    plan: snapshot.plan,
    reportCount: snapshot.reportCount,
    logCount: snapshot.logCount,
    distinctPatientCount: snapshot.distinctPatientCount,
    limit: snapshot.limit,
    allowed: snapshot.allowed,
  });
}
