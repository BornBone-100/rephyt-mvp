-- 문서 충실도 기반 방어 점수(루브릭). AI compliance_score와 별도 보관
alter table if exists public.cdss_guardrail_logs
  add column if not exists defense_score smallint;

comment on column public.cdss_guardrail_logs.defense_score is '0-100 documentation defense score from Step1-4 rubric (non-AI)';
