import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { upsertProfessionalProfile } from "@/lib/profile/upsert-professional-profile";

type RouteContext = { params: Promise<{ lang: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { lang } = await context.params;
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch {
              // 리다이렉트 시 쿠키 설정 에러 방지
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: "", ...options });
            } catch {
              // 리다이렉트 시 쿠키 삭제 에러 방지
            }
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const profileName = typeof user?.user_metadata?.name === "string" ? user.user_metadata.name : "";
      if (user) {
        await upsertProfessionalProfile({
          userId: user.id,
          name: user.user_metadata?.name ?? null,
          licenseNo: user.user_metadata?.license_no ?? null,
          experienceYears: user.user_metadata?.experience_years ?? null,
          specialties: Array.isArray(user.user_metadata?.specialties) ? user.user_metadata.specialties : [],
          hospitalName: user.user_metadata?.hospital_name ?? null,
          blogUrl: user.user_metadata?.blog_url ?? null,
          bio: user.user_metadata?.bio ?? null,
          slogan: typeof user.user_metadata?.slogan === "string" ? user.user_metadata.slogan : null,
        });
      }
      const welcomeQuery = profileName ? `?welcomeName=${encodeURIComponent(profileName)}` : "";
      return NextResponse.redirect(`${origin}/${lang}/dashboard/patients${welcomeQuery}`);
    }
  }

  return NextResponse.redirect(`${origin}/${lang}/dashboard/patients`);
}
