-- Re:PhyT 전자 서명/동의서 스키마
-- Supabase SQL Editor에서 그대로 실행 가능

-- 1) 서명 이미지 저장 버킷 (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'patient_signatures',
  'patient_signatures',
  false,
  10485760, -- 10MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2) 환자 동의 내역 테이블
create table if not exists public.patient_consents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid null,
  therapist_id uuid not null references auth.users(id) on delete cascade,
  signature_image_url text not null,
  agreed_at timestamptz not null default now()
);

alter table public.patient_consents enable row level security;

-- 3) patient_consents RLS: 로그인한 치료사 본인 레코드만
drop policy if exists "patient_consents_select_own" on public.patient_consents;
create policy "patient_consents_select_own"
on public.patient_consents
for select
to authenticated
using (therapist_id = auth.uid());

drop policy if exists "patient_consents_insert_own" on public.patient_consents;
create policy "patient_consents_insert_own"
on public.patient_consents
for insert
to authenticated
with check (therapist_id = auth.uid());

drop policy if exists "patient_consents_update_own" on public.patient_consents;
create policy "patient_consents_update_own"
on public.patient_consents
for update
to authenticated
using (therapist_id = auth.uid())
with check (therapist_id = auth.uid());

drop policy if exists "patient_consents_delete_own" on public.patient_consents;
create policy "patient_consents_delete_own"
on public.patient_consents
for delete
to authenticated
using (therapist_id = auth.uid());

-- 4) storage.objects RLS: patient_signatures 버킷에서 본인 폴더(auth.uid())만 접근
-- 경로 규칙: {auth.uid()}/{uuid}.png
drop policy if exists "patient_signatures_insert_own" on storage.objects;
create policy "patient_signatures_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'patient_signatures'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "patient_signatures_select_own" on storage.objects;
create policy "patient_signatures_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'patient_signatures'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "patient_signatures_update_own" on storage.objects;
create policy "patient_signatures_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'patient_signatures'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'patient_signatures'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "patient_signatures_delete_own" on storage.objects;
create policy "patient_signatures_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'patient_signatures'
  and (storage.foldername(name))[1] = auth.uid()::text
);

