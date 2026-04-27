import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type Payload = {
  userId?: string;
  amount?: number;
  orderName?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Payload;
    const userId = String(body.userId ?? "").trim();
    const amount = Number(body.amount ?? 0);
    const orderName = String(body.orderName ?? "Re:PhyT Pro 결제").trim();

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId가 필요합니다." }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: "amount는 0보다 큰 숫자여야 합니다." }, { status: 400 });
    }

    const nicepayClientId = process.env.NEXT_PUBLIC_NICEPAY_CLIENT_ID;
    const nicepaySecretKey = process.env.NICEPAY_MERCHANT_KEY;
    if (!nicepayClientId || !nicepaySecretKey) {
      return NextResponse.json(
        { success: false, error: "NicePay 환경변수(NEXT_PUBLIC_NICEPAY_CLIENT_ID, NICEPAY_MERCHANT_KEY)를 확인해 주세요." },
        { status: 500 },
      );
    }

    // 1) DB에서 유저 빌키 조회
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, billing_key")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ success: false, error: profileError.message }, { status: 500 });
    }
    if (!profile?.billing_key) {
      return NextResponse.json({ success: false, error: "빌키가 없습니다." }, { status: 400 });
    }

    // 2) 나이스페이 빌키 승인 API 호출
    const credentials = Buffer.from(`${nicepayClientId}:${nicepaySecretKey}`).toString("base64");
    const orderId = `rephyt_${Date.now()}`;

    const paymentResponse = await fetch("https://api.nicepay.co.kr/v1/billkey/pay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        bid: profile.billing_key,
        amount,
        orderId,
        orderName,
      }),
    });

    const paymentData = await paymentResponse.json().catch(() => ({}));
    const approved = paymentResponse.ok && (paymentData?.resultCode == null || paymentData?.resultCode === "0000");

    // 3) 결제 성공 시 플랜 상태 업데이트
    if (approved) {
      const nowIso = new Date().toISOString();
      const primaryUpdate = {
        subscription_plan: "pro",
        plan_type: "pro",
        plan_tier: "pro",
        last_payment_status: "success",
        last_payment_at: nowIso,
      };

      const { error: updateErr } = await supabase
        .from("profiles")
        .update(primaryUpdate as any)
        .eq("id", userId);

      // 일부 신규 컬럼이 아직 DB에 없을 수 있어 최소 필드로 한 번 더 시도
      if (updateErr) {
        await supabase
          .from("profiles")
          .update({
            plan_type: "pro",
            plan_tier: "pro",
          })
          .eq("id", userId);
      }
    }

    return NextResponse.json({
      success: approved,
      paymentOk: approved,
      orderId,
      resultCode: paymentData?.resultCode ?? null,
      resultMsg: paymentData?.resultMsg ?? null,
      raw: paymentData,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "서버 오류";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

