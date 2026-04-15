import { NextResponse } from "next/server";

// 1. 나이스페이 등록 확인용 (GET 요청 오면 무조건 OK)
export async function GET() {
  return new Response("OK", { status: 200 });
}

// 2. 실제 웹훅 데이터 수신용 (POST 요청)
export async function POST(request: Request) {
  try {
    // 일단 나이스페이에게 잘 받았다고 먼저 대답 (그래야 FAIL이 안 뜸)
    console.log("나이스페이 웹훅 수신됨");

    // 이 밑으로는 나중에 결제 검증 로직을 넣어도 됩니다.
    // 지금은 등록이 우선이므로 무조건 성공 응답을 보냅니다.
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("웹훅 에러:", error);
    return new Response("FAIL", { status: 500 });
  }
}
