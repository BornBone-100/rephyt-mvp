import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getClientEnv } from "@/lib/env";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const token_hash = searchParams.get("token_hash") ?? searchParams.get("token");

  const cookieStore = await cookies();
  const clientEnv = getClientEnv();
  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );

  // 1) OAuth/PKCE 로그인 콜백: `?code=...` 가 오면 exchangeCodeForSession 수행
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/", origin));
    }
    return NextResponse.redirect(new URL("/dashboard/patients", origin));
  }

  // 2) 이메일 인증(회원가입 확인) 콜백: 일반적으로 `?type=...&token_hash=...` 로 옴
  if (type && token_hash) {
    const tryTypes = [type];
    // Supabase에서 이메일 확인 링크의 `type`이 환경/템플릿에 따라 달라질 수 있어
    // 하나 더 안전장치를 추가합니다. (예: email <-> signup)
    if (type === "email") tryTypes.push("signup");
    if (type === "signup") tryTypes.push("email");

    for (const otpType of tryTypes) {
      const { error } = await supabase.auth.verifyOtp({
        type: otpType as any,
        token_hash,
      });
      if (!error) {
        return NextResponse.redirect(new URL("/dashboard/patients", origin));
      }
    }

    return NextResponse.redirect(new URL("/", origin));
  }

  // 알 수 없는 콜백 파라미터
  return NextResponse.redirect(new URL("/", origin));
}

