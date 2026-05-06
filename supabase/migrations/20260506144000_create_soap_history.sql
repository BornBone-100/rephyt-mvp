-- AI screening finalize feedback loop audit table
create table if not exists public.soap_history (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  original_ai_output text not null,
  final_therapist_decision text not null,
  is_modified boolean not null default false,
  metrics jsonb,
  timestamp timestamptz not null default now(),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists soap_history_patient_idx on public.soap_history(patient_id);
create index if not exists soap_history_created_at_idx on public.soap_history(created_at desc);
create index if not exists soap_history_is_modified_idx on public.soap_history(is_modified);

alter table public.soap_history enable row level security;

drop policy if exists soap_history_select on public.soap_history;
create policy soap_history_select on public.soap_history
for select using (
  created_by = auth.uid() or public.can_access_patient(patient_id)
);

drop policy if exists soap_history_insert on public.soap_history;
create policy soap_history_insert on public.soap_history
for insert with check (
  created_by = auth.uid() and public.can_access_patient(patient_id)
);
