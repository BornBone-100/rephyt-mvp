import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cardNumber, expMonth, expYear, cardPw, idNo, userId } = body;

    const clientId = process.env.NEXT_PUBLIC_NICEPAY_CLIENT_ID;
    const secretKey = process.env.NICEPAY_MERCHANT_KEY;

    const rawData = `cardNo=${cardNumber}&expYear=${expYear}&expMonth=${expMonth}&idNo=${idNo}&cardPw=${cardPw}`;
    const aesKey = secretKey!.substring(0, 16);
    const cipher = crypto.createCipheriv('aes-128-ecb', aesKey, null);
    let encData = cipher.update(rawData, 'utf8', 'hex');
    encData += cipher.final('hex');
    const credentials = Buffer.from(`${clientId}:${secretKey}`).toString('base64');

    const regResponse = await fetch('https://api.nicepay.co.kr/v1/subscribe/regist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${credentials}` },
      body: JSON.stringify({ encData, orderId: `rephyt_reg_${Date.now()}` }),
    });
    const regData = await regResponse.json();
    if (regData.resultCode !== '0000') {
      return NextResponse.json({ success: false, message: regData.resultMsg });
    }

    const bid = regData.bid as string;

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: '카드 등록은 되었으나 로그인 유저 ID(userId)가 전달되지 않았습니다.',
      });
    }

    const today = new Date();
    const trialEndDate = new Date(today);
    trialEndDate.setDate(today.getDate() + 2);
    const nextBillingDate = trialEndDate.toISOString().split('T')[0];

    const { error: dbError } = await supabase.from('profiles').upsert(
      {
        id: userId,
        billing_key: bid,
        grade: 'Pro',
        plan_tier: 'trial',
        monthly_amount: 5900,
        next_billing_date: nextBillingDate,
      },
      { onConflict: 'id' },
    );

    if (dbError) {
      return NextResponse.json({ success: false, message: `DB 업데이트 실패: ${dbError.message}` });
    }

    return NextResponse.json({ success: true, message: '무료 체험 등록 성공' });
  } catch {
    return NextResponse.json({ success: false, message: '카드 등록 실패' }, { status: 500 });
  }
}
