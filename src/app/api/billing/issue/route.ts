import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// 1. Supabase 클라이언트 설정
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
      headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${credentials}` },
      body: JSON.stringify({ amount: 9900, orderId: `rephyt_pay_${Date.now()}`, goodsName: "Re:PhyT Pro 1개월 정기구독", cardQuota: "00", useShopInterest: "N", buyerName: "원장님", buyerEmail: "test@rephyt.com", charSet: "utf-8", edition: "v1" }),
    });
    const payData = await payResponse.json();

    if (payData.resultCode === '0000') {
      // ⭐ 3. 드디어 Supabase에 빌링키 저장 및 등급 업그레이드!
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ 
          billing_key: bid, // 발급받은 빌링키 저장
          grade: 'Pro'      // 유저 등급 변경
        })
        .eq('id', userId);

      if (dbError) {
        return NextResponse.json({ success: false, message: "결제는 성공했으나 등급 업데이트에 실패했습니다." });
      }

      return NextResponse.json({ success: true, message: "구독 결제가 완료되었습니다!" });
    } else {
      return NextResponse.json({ success: false, message: payData.resultMsg });
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: "서버 오류 발생" }, { status: 500 });
  }
}
