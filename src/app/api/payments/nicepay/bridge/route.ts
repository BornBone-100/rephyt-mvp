import { NextResponse } from "next/server";
import crypto from "crypto";
// import { createClient } from '@supabase/supabase-js';

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cardNo, expYear, expMonth, idNo, cardPw } = body as {
      cardNo?: string;
      expYear?: string;
      expMonth?: string;
      idNo?: string;
      cardPw?: string;
    };

    const clientId = process.env.NICEPAY_CLIENT_ID || "R2_50afd2cf35c840f4b835cf478eec7282";
    // 주의: 실제 V4 Secret Key를 반드시 설정하세요.
    const secretKey = process.env.NICEPAY_SECRET_KEY || "8cfee92c97e54e4db5ae7950f764c741";

    // 1. 헤더용 인증키 (Basic Auth)
    const authString = Buffer.from(`${clientId}:${secretKey}`).toString("base64");

    // 2. 카드 정보를 나이스페이 규칙에 맞게 하나의 문자열(쿼리스트링)로 조립
    const rawData = `cardNo=${cardNo}&expYear=${expYear}&expMonth=${expMonth}&idNo=${idNo}&cardPw=${cardPw}`;

    // 3. 핵심: AES-128-ECB 방식으로 암호화하여 encData 생성
    // 나이스페이 규칙: Secret Key의 맨 앞 16자리를 암호화 키로 사용
    const aesKey = secretKey.substring(0, 16);
    const cipher = crypto.createCipheriv("aes-128-ecb", Buffer.from(aesKey, "utf8"), null);
    let encData = cipher.update(rawData, "utf8", "hex");
    encData += cipher.final("hex");

    // 4. 나이스페이 서버로 암호화된 데이터(encData) 발급 요청
    const nicepayResponse = await fetch("https://api.nicepay.co.kr/v1/subscribe/regist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify({
        orderId: "bill_" + Date.now(),
        encData: encData,
      }),
    });

    const nicepayResult = await nicepayResponse.json();

    // 5. 발급 결과 확인
    if (nicepayResult.resultCode === "0000") {
      const billingKey = nicepayResult.bid;
      console.log("✅ 빌링키 발급 성공:", billingKey);

      // TODO: Supabase 주석 풀고 유저 DB에 billingKey 저장
      return NextResponse.json({ success: true, bid: billingKey, message: "구독 등록 완료" });
    } else {
      console.error("❌ 빌링키 발급 실패:", nicepayResult.resultMsg);
      return NextResponse.json({ success: false, message: nicepayResult.resultMsg }, { status: 400 });
    }
  } catch (error) {
    console.error("🔥 서버 내부 에러:", error);
    return NextResponse.json({ success: false, message: "서버와 통신 중 문제가 발생했습니다." }, { status: 500 });
  }
}
