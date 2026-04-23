-- profiles에 plan_type 컬럼이 없을 때 한 번 실행 (기존 행은 무료로 간주)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS plan_type text;

COMMENT ON COLUMN public.profiles.plan_type IS 'free | pro | trial 등 과금 구분 (앱 로직과 RPC와 일치시키세요)';
