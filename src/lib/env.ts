import { z } from "zod";

const serverSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

let cachedServerEnv: z.infer<typeof serverSchema> | null = null;
let cachedClientEnv: z.infer<typeof clientSchema> | null = null;

function formatZodError(prefix: string, error: z.ZodError) {
  const details = error.issues
    .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  return `${prefix}\n${details}\n\n힌트: .env.example을 참고해 .env.local을 설정하세요.`;
}

export function getServerEnv() {
  if (cachedServerEnv) return cachedServerEnv;
  const parsed = serverSchema.safeParse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  if (!parsed.success) {
    throw new Error(formatZodError("[서버 환경변수 오류]", parsed.error));
  }
  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

export function getClientEnv() {
  if (cachedClientEnv) return cachedClientEnv;
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    throw new Error(formatZodError("[클라이언트 환경변수 오류]", parsed.error));
  }
  cachedClientEnv = parsed.data;
  return cachedClientEnv;
}

