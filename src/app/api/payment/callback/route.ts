import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 마스터키로 Supabase 연결 (무조건 DB 수정 가능하도록)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    // 1. 나이스페이가 보낸 데이터 받기 (JSON 또는 Form 데이터 모두 호환되도록 처리)
    let data: any = {};
    const contentType = request.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      data = await request.json();
    } else {
      const text = await request.text();
      const params = new URLSearchParams(text);
      data = Object.fromEntries(params.entries());
    }

    // 🔍 Vercel 로그용: 나이스페이가 정확히 어떤 데이터를 보내는지 터미널에 기록
    console.log("나이스페이 웹훅 수신 데이터:", data);

    // 2. 취소된 결제의 정보 추출
    // (나이스페이는 보통 취소 시 거래번호(tid), 주문번호(orderId), 빌링키(bid) 등을 보내줍니다)
    // ※ 주의: 실제 나이스페이 로그를 보고 정확한 변수명으로 매칭해야 합니다.
    const targetBid = data.bid; // 웹훅으로 넘어온 빌링키라고 가정
    const resultCode = data.ResultCode; // 예: 취소 성공 코드
    
    // 만약 빌링키가 넘어왔다면, 해당 빌링키를 가진 유저를 강등시킵니다.
    if (targetBid) {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          grade: 'basic', 
          plan_tier: 'basic',
          billing_key: null // 🚀 취소됐으니 빌링키도 삭제해 버립니다.
        })
        .eq('billing_key', targetBid); // 이 빌링키를 가진 원장님 찾기

      if (error) {
        console.error("웹훅 - DB 강등 업데이트 실패:", error);
      } else {
        console.log(`웹훅 - 빌링키 ${targetBid} 유저 기본 등급으로 강등 완료`);
      }
    }

    // 3. 나이스페이 서버에게 "알림 잘 받았어!" 라고 꼭 응답해 주어야 합니다.
    // (안 그러면 나이스페이가 못 받은 줄 알고 계속 알림을 보냅니다)
    return new NextResponse("OK", {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });

  } catch (error) {
    console.error("웹훅 처리 중 에러 발생:", error);
    return NextResponse.json({ success: false, message: "Webhook Error" }, { status: 500 });
  }
}