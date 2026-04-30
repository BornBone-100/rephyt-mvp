import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { cardNo, expYear, expMonth, idNo, cardPw } = body;

    // 🚨 [최종 보정] 데이터 규격 및 암호화 방식 완벽 일치화
    const cleanCardNo = cardNo.replace(/[^0-9]/g, ""); // 숫자만 추출
    const cleanExpYear = expYear.toString().slice(-2); // 2026 -> 26
    const cleanExpMonth = expMonth.toString().padStart(2, "0"); // 5 -> 05

    // 🚨 [강제 집행] 프론트에서 8자리를 주든 6자리를 주든, 무조건 6자리로 만듭니다.
    let cleanIdNo = idNo.replace(/[^0-9]/g, "");
    if (cleanIdNo.length === 8) {
      // 19880101 -> 880101로 강제 치환
      cleanIdNo = cleanIdNo.substring(2, 8);
    }
    // 🚨 로그로 한 번 더 확인하세요. (이게 6자리여야 성공합니다)
    console.log(`🕵️ [최종 전송 데이터 확인] IDNo: ${cleanIdNo}`);
    const cleanCardPw = cardPw.toString().substring(0, 2);

    const clientId = "R2_50afd2cf35c840f4b835cf478eec7282";
    const secretKey = "33F49GnV9mU6mY9jDIn1pP62qI08n72H";
    const authString = Buffer.from(`${clientId}:${secretKey}`).toString("base64");

    // 매뉴얼 규격: PascalCase 파라미터명 준수
    const rawData = `CardNo=${cleanCardNo}&ExpYear=${cleanExpYear}&ExpMonth=${cleanExpMonth}&IDNo=${cleanIdNo}&CardPw=${cleanCardPw}`;
    console.log("-----------------------------------------");
    console.log("🚀 [실거래 전송 직전 데이터]:", rawData);
    console.log("-----------------------------------------");
    const aesKey = secretKey.substring(0, 16);
    const cipher = crypto.createCipheriv("aes-128-ecb", Buffer.from(aesKey, "utf8"), null);
    let encData = cipher.update(rawData, "utf8", "hex");
    encData += cipher.final("hex");

    const registRes = await fetch("https://api.nicepay.co.kr/v1/subscribe/regist", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${authString}` },
      body: JSON.stringify({
        orderId: "reg_" + Date.now(),
        encData,
        encMode: "A1", // aes-128-ecb 사용 시 A1
      }),
    });

    const registResult = await registRes.json();
    console.log("-----------------------------------------");
    console.log("🔍 [나이스페이 전체 응답]:", JSON.stringify(registResult, null, 2));
    console.log("-----------------------------------------");

    return NextResponse.json({
      success: registResult.resultCode === "0000",
      message: registResult.resultMsg,
      debug: {
        sentData: rawData,
        response: registResult,
        timestamp: new Date().toISOString(),
        checkPoints: {
          cardNoLen: cleanCardNo.length,
          idNoLen: cleanIdNo.length,
          expDate: `${cleanExpYear}${cleanExpMonth}`,
          encMode: "A1",
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "서버 내부 오류: " + error.message }, { status: 500 });
  }
}
