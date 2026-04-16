import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cardNumber, expMonth, expYear, cardPw, idNo } = body;

    const clientId = process.env.NEXT_PUBLIC_NICEPAY_CLIENT_ID;
    const secretKey = process.env.NICEPAY_MERCHANT_KEY;

    if (!clientId || !secretKey) {
      return NextResponse.json({ success: false, message: "결제 설정(환경변수)이 누락되었습니다." }, { status: 500 });
    }

    // 1. 나이스페이가 요구하는 규격대로 카드 정보 문자열 결합
    const rawData = `cardNo=${cardNumber}&expYear=${expYear}&expMonth=${expMonth}&idNo=${idNo}&cardPw=${cardPw}`;

    // 2. AES-128-ECB 암호화
    // (암호키는 발급받으신 SecretKey의 앞 16자리만 잘라서 사용합니다)
    const aesKey = secretKey.substring(0, 16);
    const cipher = crypto.createCipheriv('aes-128-ecb', aesKey, null);
    let encData = cipher.update(rawData, 'utf8', 'hex');
    encData += cipher.final('hex');

    // 3. API 통신을 위한 Basic 인증 헤더 생성
    const credentials = Buffer.from(`${clientId}:${secretKey}`).toString('base64');
    const orderId = `rephyt_sub_${Date.now()}`;

    // 4. 나이스페이 빌링키 발급 API로 POST 요청
    const response = await fetch('https://api.nicepay.co.kr/v1/subscribe/regist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
      },
      body: JSON.stringify({
        encData: encData, // 암호화된 카드 정보
        orderId: orderId, // 주문번호
      }),
    });

    const data = await response.json();

    if (data.resultCode === '0000') {
      // 🚀 성공! 나이스페이가 빌링키(bid)를 줬습니다.
      const bid = data.bid;

      // TODO: 여기서 Supabase 등에 해당 유저 ID와 함께 이 `bid` 값을 저장해야 합니다!
      // 나중에 매달 이 bid를 써서 9,900원씩 결제를 일으키게 됩니다.

      return NextResponse.json({
        success: true,
        bid: bid,
        message: "빌링키가 성공적으로 발급되었습니다."
      });
    } else {
      // 정보 오입력, 한도 초과 등 나이스페이 측 거절
      console.error("나이스페이 거절 사유:", data.resultMsg);
      return NextResponse.json({
        success: false,
        message: data.resultMsg || "카드 정보 확인 후 다시 시도해주세요."
      }, { status: 400 });
    }

  } catch (error) {
    console.error("서버 내부 오류:", error);
    return NextResponse.json({ success: false, message: "서버 통신 오류가 발생했습니다." }, { status: 500 });
  }
}
