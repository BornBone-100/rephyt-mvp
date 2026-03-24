import { createBrowserClient } from "@supabase/ssr";
import { getClientEnv } from "@/lib/env";
import type { Database } from "@/types/supabase";

export function createSupabaseBrowserClient() {
  const clientEnv = getClientEnv();
  return createBrowserClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

