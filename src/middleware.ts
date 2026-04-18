import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const locales = ["ko", "en"];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 이미 URL에 /ko나 /en이 포함되어 있다면 그대로 둡니다.
  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`,
  );

  // 언어 코드가 없다면 (예: 루트 도메인만으로 접속 시) 기본 로케일로 보냅니다.
  if (pathnameIsMissingLocale) {
    return NextResponse.redirect(new URL(`/ko${pathname}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // 미들웨어가 작동할 경로 설정 (api, _next 등은 제외)
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
