import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

function extractUserId(orderId: string | undefined, mallReserved: string | undefined) {
  const reserved = mallReserved?.trim();
  if (reserved) return reserved;

  const rawOrderId = orderId?.trim() ?? "";
  const match = /^order_([0-9a-f-]{36})_\d+$/i.exec(rawOrderId);
  return match?.[1] ?? null;
}

export async function POST(request: Request) {
  try {
    // 1. 나이스페이가 보낸 데이터 받기
    const data = await request.json();
    const resultCode = data?.resultCcde ?? data?.resultCode;
    const amt = String(data?.amt ?? "");
    const merchantID = String(data?.merchantID ?? "");
    const ediDate = String(data?.ediDate ?? "");
    const signData = String(data?.signData ?? "");
    const orderId = typeof data?.orderId === "string" ? data.orderId : undefined;
    const mallReserved = typeof data?.mallReserved === "string" ? data.mallReserved : undefined;

    // 2. 내 서버에 저장된 비밀 키 가져오기
    const merchantKey = process.env.NICEPAY_MERCHANT_KEY;
    if (!merchantKey) {
      return NextResponse.json(
        { result: "error", message: "서버 설정 오류: NICEPAY_MERCHANT_KEY 없음" },
        { status: 500 },
      );
    }

    // 3. 위조 방지 검증 (해시 값 비교)
    const verifyString = ediDate + merchantID + amt + merchantKey;
    const serverSignData = crypto
      .createHash("sha256")
      .update(verifyString)
      .digest("hex");

    // 4. 검증 결과 확인
    if (signData === serverSignData && resultCode === "0000") {
      const userId = extractUserId(orderId, mallReserved);
      if (!userId) {
        return NextResponse.json(
          { result: "fail", message: "유저 식별 정보(orderId/mallReserved) 누락" },
          { status: 400 },
        );
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !serviceRoleKey) {
        return NextResponse.json(
          { result: "error", message: "서버 설정 오류: Supabase 환경변수 누락" },
          { status: 500 },
        );
      }

      const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { error } = await supabase
        .from("profiles")
        .update({ plan_tier: "pro" })
        .eq("id", userId);

      if (error) {
        return NextResponse.json(
          { result: "error", message: `등급 업데이트 실패: ${error.message}` },
          { status: 500 },
        );
      }

      return NextResponse.json({
        result: "success",
        message: "결제 및 등급 업데이트 완료",
      });
    }

    return NextResponse.json(
      { result: "fail", message: "검증 실패" },
      { status: 400 },
    );
  } catch {
    return NextResponse.json(
      { result: "error", message: "서버 오류" },
      { status: 500 },
    );
  }
}
