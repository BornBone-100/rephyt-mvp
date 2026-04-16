import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// 1. Supabase 클라이언트 설정
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cardNumber, expMonth, expYear, cardPw, idNo, userId } = body;

    const clientId = process.env.NEXT_PUBLIC_NICEPAY_CLIENT_ID;
    const secretKey = process.env.NICEPAY_MERCHANT_KEY;

    // --- [중략] 이전과 동일한 암호화 및 나이스페이 통신 로직 ---
    const rawData = `cardNo=${cardNumber}&expYear=${expYear}&expMonth=${expMonth}&idNo=${idNo}&cardPw=${cardPw}`;
    const aesKey = secretKey!.substring(0, 16);
    const cipher = crypto.createCipheriv('aes-128-ecb', aesKey, null);
    let encData = cipher.update(rawData, 'utf8', 'hex');
    encData += cipher.final('hex');
    const credentials = Buffer.from(`${clientId}:${secretKey}`).toString('base64');

    // 빌링키 발급 요청
    const regResponse = await fetch('https://api.nicepay.co.kr/v1/subscribe/regist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${credentials}` },
      body: JSON.stringify({ encData, orderId: `rephyt_reg_${Date.now()}` }),
    });
    const regData = await regResponse.json();
    if (regData.resultCode !== '0000') return NextResponse.json({ success: false, message: regData.resultMsg });
    const bid = regData.bid;

    // 첫 달 결제 승인 요청
    const payResponse = await fetch(`https://api.nicepay.co.kr/v1/subscribe/${bid}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`
      },
      body: JSON.stringify({
        amount: 9900,
        orderId: `rephyt_pay_${Date.now()}`,
        goodsName: "Re:PhyT Pro 1개월 정기구독",
        cardQuota: 0,
        useShopInterest: false
      }),
    });
    const payData = await payResponse.json();
    console.log("나이스페이 결제 응답 데이터:", payData);

    if (payData.resultCode === '0000') {
      // 🔍 디버그용: 넘어온 userId 확인
      console.log("결제 성공! DB 업데이트 시도... 전달받은 userId:", userId);

      // 만약 프론트엔드에서 userId를 아예 안 보냈다면 여기서 즉시 차단
      if (!userId) {
         return NextResponse.json({ 
           success: false, 
           message: "결제는 성공했으나, 로그인된 유저 ID(userId)가 백엔드로 전달되지 않았습니다." 
         });
      }

      const { error: dbError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          billing_key: bid,
          grade: 'Pro',
          plan_tier: 'pro'
        }, { onConflict: 'id' });

      if (dbError) {
        return NextResponse.json({ success: false, message: `DB 업데이트 실패: ${dbError.message}` });
      }

      return NextResponse.json({ success: true, message: "구독 결제 및 등급 업데이트 완벽하게 성공!" });
    } else {
      return NextResponse.json({ success: false, message: payData.resultMsg });
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: "서버 오류 발생" }, { status: 500 });
  }
}
