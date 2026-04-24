-- Step1~4 기반 회복 예측도·예상 기간 텍스트 (저장 시 스냅샷)
alter table if exists public.cdss_guardrail_logs
  add column if not exists recovery_score smallint;

alter table if exists public.cdss_guardrail_logs
  add column if not exists recovery_timeframe text;

comment on column public.cdss_guardrail_logs.recovery_score is '10-95 recovery prognosis from original_data rubric';
comment on column public.cdss_guardrail_logs.recovery_timeframe is 'Korean recovery timeframe narrative (snapshot at save)';
