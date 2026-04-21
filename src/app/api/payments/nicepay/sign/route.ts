import crypto from "crypto";
import { NextResponse } from "next/server";

type SignRequestBody = {
  orderId?: string;
  amount?: string;
  goodsName?: string;
  userId?: string;
  buyerName?: string;
  buyerEmail?: string;
  returnUrl?: string;
  mid?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SignRequestBody;

    const merchantKey = process.env.NICEPAY_MERCHANT_KEY;
    const fallbackMid = process.env.NEXT_PUBLIC_NICEPAY_MID || process.env.NEXT_PUBLIC_NICEPAY_CLIENT_ID || "nictest00m";
    const mid = body.mid || fallbackMid;
    const moid = body.orderId;
    const amt = body.amount;
    const goodsName = body.goodsName || "Re:PhyT Pro 구독";
    const returnUrl = body.returnUrl || `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/payments/nicepay/callback`;

    if (!merchantKey) {
      return NextResponse.json({ success: false, message: "NICEPAY_MERCHANT_KEY 환경변수가 없습니다." }, { status: 500 });
    }
    if (!moid || !amt) {
      return NextResponse.json({ success: false, message: "주문번호 또는 결제금액이 누락되었습니다." }, { status: 400 });
    }

    const ediDate = Date.now().toString();
    const signData = crypto
      .createHash("sha256")
      .update(`${ediDate}${mid}${amt}${merchantKey}`)
      .digest("hex");

    const authData: Record<string, string> = {
      PayMethod: "CARD",
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
