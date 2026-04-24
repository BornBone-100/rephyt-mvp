-- =============================================================================
-- Re:PhyT: 휴대폰 본인인증(SMS OTP) 및 다중 가입 방지
-- Supabase SQL Editor 또는 `supabase db push`로 적용하세요.
-- =============================================================================

-- 1) profiles: 휴대폰·브랜딩(슬로건) — phone_number는 NULL 허용, 값이 있으면 유일
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS slogan text;

-- 동일 번호로 두 계정 가입 시 DB에서 차단 (NULL은 UNIQUE에서 서로 구분되어 여러 행 허용)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_number_unique
  ON public.profiles (phone_number)
  WHERE phone_number IS NOT NULL;

COMMENT ON COLUMN public.profiles.phone_number IS 'E.164 형식 권장 (예: +821012345678). 가입 시 SMS 검증 후 저장.';

-- 2) 가입 전 OTP 임시 저장 (서비스 롤만 접근 권장)
CREATE TABLE IF NOT EXISTS public.signup_sms_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  session_token text UNIQUE,
  session_expires_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signup_sms_challenges_phone_created_idx
  ON public.signup_sms_challenges (phone_e164, created_at DESC);

CREATE INDEX IF NOT EXISTS signup_sms_challenges_session_idx
  ON public.signup_sms_challenges (session_token)
  WHERE session_token IS NOT NULL;

ALTER TABLE public.signup_sms_challenges ENABLE ROW LEVEL SECURITY;

-- anon/authenticated 직접 접근 차단 (API는 service role 사용)
COMMENT ON TABLE public.signup_sms_challenges IS '회원가입 SMS OTP. Next.js API(service role)에서만 읽기/쓰기.';
