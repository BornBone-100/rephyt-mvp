import crypto from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type Payload = {
  userId?: string;
  amount?: number | string;
  goodsName?: string;
};

function getNicepayEdiDate(): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    const userId = String(body.userId ?? "").trim();
    const amount = String(body.amount ?? "5900").trim();
    const goodsName = String(body.goodsName ?? "RePhyT 정기구독").trim();

    if (!userId) {
      return NextResponse.json({ success: false, message: "userId가 필요합니다." }, { status: 400 });
    }
    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ success: false, message: "amount는 0보다 커야 합니다." }, { status: 400 });
    }

    const mid = process.env.NEXT_PUBLIC_NICEPAY_MID || "nictest00m";
    const merchantKey = process.env.NICEPAY_MERCHANT_KEY;
    if (!merchantKey) {
      return NextResponse.json({ success: false, message: "NICEPAY_MERCHANT_KEY가 없습니다." }, { status: 500 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, billing_key")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ success: false, message: profileError.message }, { status: 500 });
    }
    if (!profile?.billing_key) {
      return NextResponse.json({ success: false, message: "저장된 BID(빌링키)가 없습니다." }, { status: 400 });
    }

    const ediDate = getNicepayEdiDate();
    const moid = `rephyt_rec_${Date.now()}`;
    const signData = crypto
      .createHash("sha256")
      .update(`${ediDate}${mid}${moid}${merchantKey}`)
      .digest("hex");

    const paymentResponse = await fetch("https://api.nicepay.co.kr/v1/bill/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        BID: profile.billing_key,
        MID: mid,
        Amt: amount,
        Moid: moid,
        EdiDate: ediDate,
        SignData: signData,
        GoodsName: goodsName,
        CharSet: "utf-8",
      }),
    });

    const paymentData = await paymentResponse.json().catch(() => ({}));
    const approved = paymentResponse.ok && String(paymentData?.resultCode ?? "") === "0000";

    if (approved) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextBillingDate = nextMonth.toISOString().split("T")[0];

      await supabase
        .from("profiles")
        .update({
          plan_type: "pro",
          plan_tier: "pro",
          next_billing_date: nextBillingDate,
          last_payment_status: "success",
          last_payment_at: new Date().toISOString(),
        } as any)
        .eq("id", userId);
    }

    return NextResponse.json({
      success: approved,
      resultCode: paymentData?.resultCode ?? null,
      resultMsg: paymentData?.resultMsg ?? null,
      moid,
      raw: paymentData,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "서버 오류";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
