import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * 쿠키(세션)로 본인만 구독 취소. 요청 body의 userId는 신뢰하지 않습니다.
 */
export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "권한이 없습니다. 다시 로그인해 주세요." },
        { status: 401 },
      );
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        billing_key: null,
        grade: "Free",
        plan_tier: "canceled",
        next_billing_date: null,
      } as never)
      .eq("id", user.id);

    if (error) {
      console.error("구독 취소 에러:", error);
      return NextResponse.json(
        { success: false, message: `구독 취소 실패: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, message: "구독이 정상적으로 취소되었습니다." });
  } catch (error) {
    console.error("구독 취소 에러:", error);
    return NextResponse.json(
      { success: false, message: "구독 취소 중 서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
