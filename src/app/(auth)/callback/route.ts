import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // 성공 시 이동할 곳 (루트 주소)
  const next = '/' 

  if (code) {
    const cookieStore = await cookies() // 1. 여기서 확실하게 await를 해줍니다.
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            // 서버 컴포넌트에서는 안전하게 에러를 무시하도록 설정
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // 리다이렉트 시 쿠키 설정 에러 방지
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // 리다이렉트 시 쿠키 삭제 에러 방지
            }
          },
        },
      }
    )

    // 2. 코드를 세션으로 교환 (가장 중요한 도장 찍기)
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // 성공하면 진짜 대시보드(/)로 이동!
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // 실패 시 일단 메인으로 보내서 404를 방지합니다.
  return NextResponse.redirect(`${origin}/`)
}