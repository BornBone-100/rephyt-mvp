-- 처치 로그(treatments)에 방문별 특이사항·다음 내원 플래그용 JSONB 저장
-- 제품 스펙의 treatment_records.metadata와 동일 역할(public.treatments.metadata)
alter table if exists public.treatments
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.treatments.metadata is 'visit follow-up: special_notes, is_flagged, change_log, created_at (ISO)';
