-- Ensure `soap_notes` has required SOAP + AI screening linkage fields.
-- Requested core columns:
-- id, patient_id, subjective, objective, assessment, plan, ai_analysis_data(json), created_at

create table if not exists public.soap_notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  subjective text,
  objective text,
  assessment text,
  plan text,
  ai_analysis_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.soap_notes
  add column if not exists objective text;

alter table public.soap_notes
  add column if not exists ai_analysis_data jsonb;

create index if not exists soap_notes_patient_created_idx
  on public.soap_notes(patient_id, created_at desc);

comment on column public.soap_notes.ai_analysis_data is
  'AI screening analysis payload (JSONB): coords, metrics, findings, confidence, etc.';
