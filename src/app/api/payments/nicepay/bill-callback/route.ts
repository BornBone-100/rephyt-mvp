import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // 1. 팝업창에서 고객 인증 후 넘어온 데이터 받기
    const formData = await request.formData();
    const tid = formData.get("tid") as string;
    const amount = formData.get("amount") as string;
    const authResultCode = formData.get("authResultCode") as string;
    const authResultMsg = formData.get("authResultMsg") as string;

    // 2. 고객이 창을 닫았거나 인증 실패한 경우 처리
    if (authResultCode !== "0000") {
      console.error(`🚨 인증 실패: ${authResultMsg}`);
      return NextResponse.redirect(`http://localhost:3000/pricing?error=${encodeURIComponent(authResultMsg)}`);
    }

    // 3. 🚀 [포스타트 V4의 핵심] Base64 인증 헤더 만들기
    const clientId = process.env.NEXT_PUBLIC_NICEPAY_CLIENT_KEY || "";
    const secretKey = process.env.NICEPAY_SECRET_KEY || "";

    // "클라이언트키:시크릿키" 형태의 문자열을 Base64로 암호화합니다.
    const encodedCredentials = Buffer.from(`${clientId}:${secretKey}`).toString("base64");

    // ✨ 정확한 API URL 세팅 (팝업창 인증의 최종 승인은 무조건 이 URL입니다)
    const approveUrl = `https://api.nicepay.co.kr/v1/payments/${tid}`;

    // 4. 나이스페이 서버로 최종 승인(빌링키 발급) 요청
    const response = await fetch(approveUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 발급받은 키를 Bearer가 아닌 'Basic' 방식으로 넘깁니다.
        Authorization: `Basic ${encodedCredentials}`,
      },
      body: JSON.stringify({
        amount: Number(amount), // 프론트엔드에서 세팅했던 금액 (예: 0 또는 1004)
      }),
    });

    const result = await response.json();

    // 5. 최종 결과 확인
    if (result.resultCode === "0000") {
      console.log("🎯 빌링키 발급 성공! 전체 응답:", result);

      const bid = result.bid;
      // 💡 드디어 얻어낸 정기결제 빌링키입니다! (예: BIKYnictest00m...)
      // TODO: 여기서 성준님의 DB(유저 정보 테이블)에 이 `bid` 값을 안전하게 저장하시면 됩니다.
      void bid;

      // 성공 페이지로 이동
      return NextResponse.redirect(`http://localhost:3000/pricing/success`);
    } else {
      console.error("❌ 승인 요청 실패:", result);
      return NextResponse.redirect(`http://localhost:3000/pricing?error=${encodeURIComponent(result.resultMsg)}`);
    }
  } catch (error) {
    console.error("서버 에러:", error);
    return NextResponse.redirect(`http://localhost:3000/pricing?error=Server_Error`);
  }
}
