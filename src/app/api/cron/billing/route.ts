import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 마스터키로 DB 연결
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 스케줄러는 GET 요청으로 실행됩니다.
export async function GET(request: Request) {
  try {
    // 1. 보안 체크: Vercel 스케줄러가 보낸 요청이 맞는지 암호(CRON_SECRET) 확인
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // 2. 오늘 날짜 구하기 (한국 시간 기준 처리 등은 편의상 UTC 기준으로 작성)
    const today = new Date().toISOString().split('T')[0];

    // 3. 결제 대상자 뽑기 (오늘이 결제일이고, Pro·체험(trial) 유저이며, 빌링키가 있는 사람)
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, billing_key, plan_tier')
      .in('plan_tier', ['pro', 'trial'])
      .not('billing_key', 'is', null)
      .lte('next_billing_date', today); // 오늘이거나 오늘보다 과거인 경우

    if (error || !users || users.length === 0) {
      return NextResponse.json({ message: '오늘 결제할 대상자가 없습니다.' });
    }

    const clientId = process.env.NEXT_PUBLIC_NICEPAY_CLIENT_ID;
    const secretKey = process.env.NICEPAY_MERCHANT_KEY;
    const credentials = Buffer.from(`${clientId}:${secretKey}`).toString('base64');

    // 4. 대상자 한 명씩 순회하며 결제 요청
    for (const user of users) {
      const payResponse = await fetch(`https://api.nicepay.co.kr/v1/subscribe/${user.billing_key}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${credentials}` },
        body: JSON.stringify({
          amount: 5900,
          orderId: `rephyt_auto_${Date.now()}`,
          goodsName: "Re:PhyT Pro 정기구독 자동결제",
          cardQuota: 0,
          useShopInterest: false
        }),
      });

      const payData = await payResponse.json();

      if (payData.resultCode === '0000') {
        // 결제 성공: 다음 결제일을 다시 한 달 뒤로 연장 (체험 종료 후 첫 결제면 pro로 전환)
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const nextDate = nextMonth.toISOString().split('T')[0];

        const updates: { next_billing_date: string; plan_tier?: string } = {
          next_billing_date: nextDate,
        };
        if (user.plan_tier === 'trial') {
          updates.plan_tier = 'pro';
        }

        await supabase.from('profiles').update(updates).eq('id', user.id);

        console.log(`[성공] 유저 ${user.id} 결제 완료 및 한 달 연장`);
      } else {
        // 결제 실패 (잔액 부족, 한도 초과 등): 등급을 Basic으로 강등
        await supabase
          .from('profiles')
          .update({ grade: 'basic', plan_tier: 'basic' })
          .eq('id', user.id);

        console.log(`[실패] 유저 ${user.id} 결제 실패로 강등 처리. 사유: ${payData.resultMsg}`);
      }
    }

    return NextResponse.json({ success: true, message: "오늘의 자동 결제 작업 완료!" });

  } catch (error) {
    return NextResponse.json({ success: false, message: "서버 오류" }, { status: 500 });
  }
}
