import { NextResponse } from "next/server";

/**
 * 나이스페이 등 PG사가 결제 결과를 전달하는 엔드포인트입니다.
 * 실제 운영 시 PG 문서에 맞춰 검증·DB 반영·리다이렉트를 구현하세요.
 */
export async function POST(request: Request) {
  const url = new URL("/pricing?payment=received", request.url);
  return NextResponse.redirect(url, 303);
}

export async function GET(request: Request) {
  const url = new URL("/pricing?payment=received", request.url);
  return NextResponse.redirect(url, 303);
}
