import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getClientEnv } from "@/lib/env";
import type { Database } from "@/types/supabase";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const clientEnv = getClientEnv();

  return createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components에서는 set이 막힐 수 있음 (Route Handler에서 처리)
          }
        },
      },
    },
  );
}

