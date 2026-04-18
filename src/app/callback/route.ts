import { NextResponse } from "next/server";

/**
 * 레거시·Supabase 기본 설정용 `/callback` → 기본 로케일 `/ko/callback` (쿼리 유지)
 */
export function GET(request: Request) {
  const url = new URL(request.url);
  url.pathname = "/ko/callback";
  return NextResponse.redirect(url);
}
