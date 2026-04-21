type PublicSupabaseConfig = {
  url: string;
  anonKey: string;
};

function assertEnv(name: string, value: string | undefined) {
  if (!value || !value.trim()) {
    throw new Error(`[Supabase Config Error] ${name} is undefined or empty.`);
  }
  return value.trim();
}

export function getSupabasePublicConfig(): PublicSupabaseConfig {
  const url = assertEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = assertEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return { url, anonKey };
}

export function getSupabaseServiceRoleKey(): string {
  return assertEnv("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
}
