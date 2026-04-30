import crypto from "crypto";
import { NextResponse } from "next/server";

type SignRequestBody = {
  orderId?: string;
  amount?: string;
  payMethod?: string;
  goodsName?: string;
  userId?: string;
  buyerName?: string;
  buyerEmail?: string;
  returnUrl?: string;
  mid?: string;
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
    const body = (await request.json()) as SignRequestBody;

    const merchantKey = (process.env.NICEPAY_MERCHANT_KEY ?? "").trim();
    const fallbackMid = process.env.NEXT_PUBLIC_NICEPAY_MID || process.env.NEXT_PUBLIC_NICEPAY_CLIENT_ID || "nictest00m";
    const mid = body.mid || fallbackMid;
    const payMethod = body.payMethod === "BILL" ? "BILL" : "CARD";
    const moid = body.orderId;
    const amt = body.amount ?? "0";
    const goodsName = body.goodsName || "Re:PhyT Pro 구독";
    const returnUrl = body.returnUrl || `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/payments/nicepay/callback`;

    if (!merchantKey) {
      return NextResponse.json({ success: false, message: "NICEPAY_MERCHANT_KEY 환경변수가 없습니다." }, { status: 500 });
    }
    if (!moid) {
      return NextResponse.json({ success: false, message: "주문번호가 누락되었습니다." }, { status: 400 });
    }
    if (payMethod !== "BILL" && !body.amount) {
      return NextResponse.json({ success: false, message: "결제금액이 누락되었습니다." }, { status: 400 });
    }

    const ediDate = getNicepayEdiDate();
    const signSource = `${ediDate}${mid}${amt}${merchantKey}`;
    const signData = crypto
      .createHash("sha256")
      .update(signSource)
      .digest("hex");

    const authData: Record<string, string> = {
      PayMethod: payMethod,
      MID: mid,
      GoodsName: goodsName,
      Amt: amt,
      Moid: moid,
      BuyerName: body.buyerName || "Re:PhyT User",
      BuyerEmail: body.buyerEmail || "",
      EdiDate: ediDate,
      SignData: signData,
      ReturnURL: returnUrl,
      UserIP: "0.0.0.0",
      CharSet: "utf-8",
      UserAgent: "WEB",
      VbankExpDate: "",
      MallReserved: `user_id=${body.userId || ""}`,
    };

    return NextResponse.json({ success: true, authData }, { status: 200 });
  } catch (error) {
    console.error("NICE Pay sign api error:", error);
    return NextResponse.json({ success: false, message: "결제 서명 생성 실패" }, { status: 500 });
  }
}
