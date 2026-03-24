-- =====================================================================
-- Re:PhyT(리핏) - Supabase PostgreSQL (Schema + RLS + RPC)
-- 실행 위치: Supabase SQL Editor
--
-- 핵심 도메인
-- - patients: 환자 기본/임상 인테이크
-- - assessments: SOAP의 O(객관) + APPI 5 Key Elements + 이학적 검사
-- - sessions: 방문 회차(담당 치료사 포함)
-- - soap_notes: 세션별 SOAP(+ AI 완성본) / assessments FK로 objective 연결
--
-- 보안
-- - RLS 기본 포함 (치료사(auth.users) 기준 격리)
-- - RPC upsert_session_bundle로 "세션+평가+SOAP"를 트랜잭션으로 저장
-- =====================================================================

create extension if not exists "pgcrypto";

do $$ begin
  create type public.sex as enum ('M','F','Other');
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Patients
-- ---------------------------------------------------------------------
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),

  created_by uuid not null references auth.users(id) on delete cascade,
  primary_therapist_id uuid references auth.users(id) on delete set null,

  -- 기본 정보
  full_name text not null,
  birth_date date,
  sex public.sex,
  occupation text,
  phone text,
  email text,
  address text,

  -- 임상 인테이크
  chief_complaint text,              -- 주 호소(Chief Complaint)
  primary_pain_area text,            -- 주요 통증 부위
  pain_areas text[] not null default '{}'::text[],
  onset_date date,                   -- 발병일(Onset Date)
  mechanism_of_injury text,          -- 손상 기전(Mechanism of Injury)
  pmhx text,                         -- 과거 병력(PMHx)
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists patients_created_by_idx on public.patients(created_by);
create index if not exists patients_primary_therapist_idx on public.patients(primary_therapist_id);
create index if not exists patients_name_idx on public.patients(full_name);

drop trigger if exists set_patients_updated_at on public.patients;
create trigger set_patients_updated_at
before update on public.patients
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Assessments (SOAP: Objective)
-- ---------------------------------------------------------------------
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),

  patient_id uuid not null references public.patients(id) on delete cascade,
  therapist_id uuid references auth.users(id) on delete set null,

  assessed_at timestamptz not null default now(),

  -- 일반 이학적 검사
  rom text,                 -- ROM (관절가동범위)
  mmt text,                 -- MMT (도수근력검사)
  special_tests text,       -- Special Tests (특수 검사 결과)

  -- 통증 스케일 (둘 중 하나 또는 둘 다 사용 가능)
  pain_vas_mm smallint,     -- 0~100 (mm)
  pain_nrs smallint,        -- 0~10

  -- APPI 5 Key Elements (정량 + 정성)
  breathing_score smallint,
  breathing_notes text,

  centering_score smallint,
  centering_notes text,

  ribcage_placement_score smallint,
  ribcage_placement_notes text,

  shoulder_girdle_org_score smallint,
  shoulder_girdle_org_notes text,

  head_neck_placement_score smallint,
  head_neck_placement_notes text,

  -- 확장(예: functional test, outcome measure, raw 구조화 데이터)
  extra jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint assessments_pain_vas_chk check (pain_vas_mm is null or (pain_vas_mm >= 0 and pain_vas_mm <= 100)),
  constraint assessments_pain_nrs_chk check (pain_nrs is null or (pain_nrs >= 0 and pain_nrs <= 10)),

  constraint assessments_score_breathing_chk check (breathing_score is null or (breathing_score >= 0 and breathing_score <= 10)),
  constraint assessments_score_centering_chk check (centering_score is null or (centering_score >= 0 and centering_score <= 10)),
  constraint assessments_score_ribcage_chk check (ribcage_placement_score is null or (ribcage_placement_score >= 0 and ribcage_placement_score <= 10)),
  constraint assessments_score_shoulder_chk check (shoulder_girdle_org_score is null or (shoulder_girdle_org_score >= 0 and shoulder_girdle_org_score <= 10)),
  constraint assessments_score_headneck_chk check (head_neck_placement_score is null or (head_neck_placement_score >= 0 and head_neck_placement_score <= 10))
);

create index if not exists assessments_patient_idx on public.assessments(patient_id);
create index if not exists assessments_assessed_at_idx on public.assessments(assessed_at);

drop trigger if exists set_assessments_updated_at on public.assessments;
create trigger set_assessments_updated_at
before update on public.assessments
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),

  patient_id uuid not null references public.patients(id) on delete cascade,
  therapist_id uuid not null references auth.users(id) on delete restrict,

  session_no integer,                 -- 1,2,3... (옵션)
  started_at timestamptz not null default now(),
  ended_at timestamptz,

  location text,
  status text default 'completed',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint sessions_no_chk check (session_no is null or session_no >= 1),
  constraint sessions_time_chk check (ended_at is null or ended_at >= started_at)
);

create index if not exists sessions_patient_idx on public.sessions(patient_id);
create index if not exists sessions_therapist_idx on public.sessions(therapist_id);
create index if not exists sessions_started_at_idx on public.sessions(started_at);

drop trigger if exists set_sessions_updated_at on public.sessions;
create trigger set_sessions_updated_at
before update on public.sessions
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- SOAP Notes (세션 기록 + AI 완성형)
-- ---------------------------------------------------------------------
create table if not exists public.soap_notes (
  id uuid primary key default gen_random_uuid(),

  session_id uuid not null references public.sessions(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  therapist_id uuid not null references auth.users(id) on delete restrict,

  -- Objective 연결
  assessment_id uuid references public.assessments(id) on delete set null,

  -- S
  subjective text,
  adl_limitations text,

  -- A
  assessment text,

  -- P
  plan text,

  -- AI 완성형 SOAP 텍스트
  ai_generated_note text,

  ai_model text,
  ai_prompt_version text,
  is_final boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists soap_session_idx on public.soap_notes(session_id);
create index if not exists soap_patient_idx on public.soap_notes(patient_id);
create index if not exists soap_assessment_idx on public.soap_notes(assessment_id);

drop trigger if exists set_soap_updated_at on public.soap_notes;
create trigger set_soap_updated_at
before update on public.soap_notes
for each row execute function public.set_updated_at();

-- =====================================================================
-- RLS (치료사 기준 격리)
-- =====================================================================

create or replace function public.can_access_patient(p_patient_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.patients p
    where p.id = p_patient_id
      and (p.created_by = auth.uid() or p.primary_therapist_id = auth.uid())
  );
$$;

alter table public.patients enable row level security;
alter table public.assessments enable row level security;
alter table public.sessions enable row level security;
alter table public.soap_notes enable row level security;

-- Patients policies
drop policy if exists patients_select on public.patients;
create policy patients_select on public.patients
for select
using (created_by = auth.uid() or primary_therapist_id = auth.uid());

drop policy if exists patients_insert on public.patients;
create policy patients_insert on public.patients
for insert
with check (created_by = auth.uid());

drop policy if exists patients_update on public.patients;
create policy patients_update on public.patients
for update
using (created_by = auth.uid() or primary_therapist_id = auth.uid())
with check (created_by = auth.uid() or primary_therapist_id = auth.uid());

drop policy if exists patients_delete on public.patients;
create policy patients_delete on public.patients
for delete
using (created_by = auth.uid());

-- Assessments policies
drop policy if exists assessments_select on public.assessments;
create policy assessments_select on public.assessments
for select
using (public.can_access_patient(patient_id));

drop policy if exists assessments_insert on public.assessments;
create policy assessments_insert on public.assessments
for insert
with check (
  public.can_access_patient(patient_id)
  and (therapist_id is null or therapist_id = auth.uid())
);

drop policy if exists assessments_update on public.assessments;
create policy assessments_update on public.assessments
for update
using (public.can_access_patient(patient_id))
with check (public.can_access_patient(patient_id));

drop policy if exists assessments_delete on public.assessments;
create policy assessments_delete on public.assessments
for delete
using (public.can_access_patient(patient_id));

-- Sessions policies
drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions
for select
using (public.can_access_patient(patient_id));

drop policy if exists sessions_insert on public.sessions;
create policy sessions_insert on public.sessions
for insert
with check (
  public.can_access_patient(patient_id)
  and therapist_id = auth.uid()
);

drop policy if exists sessions_update on public.sessions;
create policy sessions_update on public.sessions
for update
using (public.can_access_patient(patient_id) and therapist_id = auth.uid())
with check (public.can_access_patient(patient_id) and therapist_id = auth.uid());

drop policy if exists sessions_delete on public.sessions;
create policy sessions_delete on public.sessions
for delete
using (public.can_access_patient(patient_id) and therapist_id = auth.uid());

-- SOAP Notes policies
drop policy if exists soap_select on public.soap_notes;
create policy soap_select on public.soap_notes
for select
using (public.can_access_patient(patient_id));

drop policy if exists soap_insert on public.soap_notes;
create policy soap_insert on public.soap_notes
for insert
with check (
  public.can_access_patient(patient_id)
  and therapist_id = auth.uid()
  and exists (
    select 1 from public.sessions s
    where s.id = session_id
      and s.patient_id = patient_id
      and s.therapist_id = auth.uid()
  )
);

drop policy if exists soap_update on public.soap_notes;
create policy soap_update on public.soap_notes
for update
using (public.can_access_patient(patient_id) and therapist_id = auth.uid())
with check (public.can_access_patient(patient_id) and therapist_id = auth.uid());

drop policy if exists soap_delete on public.soap_notes;
create policy soap_delete on public.soap_notes
for delete
using (public.can_access_patient(patient_id) and therapist_id = auth.uid());

-- =====================================================================
-- RPC: 세션 + (선택) 평가 + SOAP 노트를 한 번에 저장 (트랜잭션)
-- =====================================================================
create or replace function public.upsert_session_bundle(
  p_patient_id uuid,
  p_started_at timestamptz default now(),
  p_ended_at timestamptz default null,
  p_location text default null,
  p_status text default 'completed',
  p_session_no integer default null,

  -- SOAP
  p_subjective text default null,
  p_adl_limitations text default null,
  p_assessment text default null,
  p_plan text default null,
  p_ai_generated_note text default null,
  p_ai_model text default null,
  p_ai_prompt_version text default null,
  p_is_final boolean default false,

  -- Assessment (optional)
  p_create_assessment boolean default true,
  p_assessed_at timestamptz default now(),
  p_rom text default null,
  p_mmt text default null,
  p_special_tests text default null,
  p_pain_vas_mm smallint default null,
  p_pain_nrs smallint default null,
  p_breathing_score smallint default null,
  p_breathing_notes text default null,
  p_centering_score smallint default null,
  p_centering_notes text default null,
  p_ribcage_placement_score smallint default null,
  p_ribcage_placement_notes text default null,
  p_shoulder_girdle_org_score smallint default null,
  p_shoulder_girdle_org_notes text default null,
  p_head_neck_placement_score smallint default null,
  p_head_neck_placement_notes text default null,
  p_extra jsonb default '{}'::jsonb
)
returns table (
  session_id uuid,
  assessment_id uuid,
  soap_note_id uuid
)
language plpgsql
security invoker
as $$
declare
  v_session_id uuid;
  v_assessment_id uuid;
  v_soap_id uuid;
begin
  insert into public.sessions (
    patient_id,
    therapist_id,
    session_no,
    started_at,
    ended_at,
    location,
    status
  )
  values (
    p_patient_id,
    auth.uid(),
    p_session_no,
    p_started_at,
    p_ended_at,
    p_location,
    p_status
  )
  returning id into v_session_id;

  if p_create_assessment then
    insert into public.assessments (
      patient_id,
      therapist_id,
      assessed_at,
      rom,
      mmt,
      special_tests,
      pain_vas_mm,
      pain_nrs,
      breathing_score,
      breathing_notes,
      centering_score,
      centering_notes,
      ribcage_placement_score,
      ribcage_placement_notes,
      shoulder_girdle_org_score,
      shoulder_girdle_org_notes,
      head_neck_placement_score,
      head_neck_placement_notes,
      extra
    )
    values (
      p_patient_id,
      auth.uid(),
      p_assessed_at,
      p_rom,
      p_mmt,
      p_special_tests,
      p_pain_vas_mm,
      p_pain_nrs,
      p_breathing_score,
      p_breathing_notes,
      p_centering_score,
      p_centering_notes,
      p_ribcage_placement_score,
      p_ribcage_placement_notes,
      p_shoulder_girdle_org_score,
      p_shoulder_girdle_org_notes,
      p_head_neck_placement_score,
      p_head_neck_placement_notes,
      coalesce(p_extra, '{}'::jsonb)
    )
    returning id into v_assessment_id;
  else
    v_assessment_id := null;
  end if;

  insert into public.soap_notes (
    session_id,
    patient_id,
    therapist_id,
    assessment_id,
    subjective,
    adl_limitations,
    assessment,
    plan,
    ai_generated_note,
    ai_model,
    ai_prompt_version,
    is_final
  )
  values (
    v_session_id,
    p_patient_id,
    auth.uid(),
    v_assessment_id,
    p_subjective,
    p_adl_limitations,
    p_assessment,
    p_plan,
    p_ai_generated_note,
    p_ai_model,
    p_ai_prompt_version,
    coalesce(p_is_final, false)
  )
  returning id into v_soap_id;

  session_id := v_session_id;
  assessment_id := v_assessment_id;
  soap_note_id := v_soap_id;
  return next;
end;
$$;

