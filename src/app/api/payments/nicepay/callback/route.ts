import { NextResponse } from "next/server";

/**
 * NICE Pay 결제창 returnUrl 콜백 엔드포인트.
 * 실제 승인/검증 로직은 연동 스펙 확정 시 서버 검증 API와 연결하세요.
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let payload: Record<string, string> = {};

    if (contentType.includes("application/json")) {
      payload = (await request.json()) as Record<string, string>;
    } else {
      const text = await request.text();
      payload = Object.fromEntries(new URLSearchParams(text).entries());
    }

    console.log("NICE Pay callback payload:", payload);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("NICE Pay callback error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
