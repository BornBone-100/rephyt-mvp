import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cardNumber, expMonth, expYear, cardPw, idNo, userId } = body;

    const clientId = process.env.NEXT_PUBLIC_NICEPAY_CLIENT_ID;
    const secretKey = process.env.NICEPAY_MERCHANT_KEY; // Vercel 환경변수에 꼭 등록하세요!

    if (!clientId || !secretKey) {
      return NextResponse.json({ success: false, message: "결제 설정 정보가 누락되었습니다." }, { status: 500 });
    }

    // --- [STEP 1] 카드 정보 암호화 (AES-128-ECB) ---
    const rawData = `cardNo=${cardNumber}&expYear=${expYear}&expMonth=${expMonth}&idNo=${idNo}&cardPw=${cardPw}`;
    const aesKey = secretKey.substring(0, 16);
    const cipher = crypto.createCipheriv('aes-128-ecb', aesKey, null);
    let encData = cipher.update(rawData, 'utf8', 'hex');
    encData += cipher.final('hex');

    const credentials = Buffer.from(`${clientId}:${secretKey}`).toString('base64');

    // --- [STEP 2] 빌링키(bid) 발급 요청 ---
    const regResponse = await fetch('https://api.nicepay.co.kr/v1/subscribe/regist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
      },
      body: JSON.stringify({
        encData: encData,
        orderId: `rephyt_reg_${Date.now()}`,
      }),
    });

    const regData = await regResponse.json();

    if (regData.resultCode !== '0000') {
      return NextResponse.json({ success: false, message: regData.resultMsg }, { status: 400 });
    }

    const bid = regData.bid; // 발급된 마스터키(빌링키)

    // --- [STEP 3] 즉시 첫 달 결제(승인) 요청 ---
    // 빌링키만 받으면 돈이 안 들어오기 때문에, 받은 키로 바로 9,900원을 청구합니다.
    const payResponse = await fetch(`https://api.nicepay.co.kr/v1/subscribe/${bid}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
      },
      body: JSON.stringify({
        amount: 9900,
        orderId: `rephyt_pay_${Date.now()}`,
        goodsName: "Re:PhyT Pro 1개월 정기구독",
      }),
    });

    const payData = await payResponse.json();

    if (payData.resultCode === '0000') {
      // ✅ [성공] 빌링키 발급 + 첫 결제 완료

      // TODO: 여기서 Supabase에 저장하는 로직을 추가하세요.
      // 1. users 테이블의 'billing_key' 컬럼에 bid 저장
      // 2. users 테이블의 'grade' 컬럼을 'Pro'로 업데이트

      return NextResponse.json({
        success: true,
        message: "구독 결제가 완료되었습니다!",
        tid: payData.tid // 거래 고유 번호
      });
    } else {
      // 빌링키는 구워졌으나 결제 승인 실패 (한도초과 등)
      return NextResponse.json({
        success: false,
        message: `빌링키 등록 성공이나 결제 실패: ${payData.resultMsg}`
      }, { status: 400 });
    }

  } catch (error) {
    console.error("Internal Server Error:", error);
    return NextResponse.json({ success: false, message: "서버 통신 중 오류가 발생했습니다." }, { status: 500 });
  }
}
