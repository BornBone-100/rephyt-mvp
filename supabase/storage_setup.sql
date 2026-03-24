-- Re:PhyT clinical media storage setup
-- Safe to run multiple times.

-- 1) Bucket 생성 (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'clinical_media',
  'clinical_media',
  false,
  52428800, -- 50MB
  array['image/jpeg', 'image/png', 'video/mp4']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2) RLS 정책 (인증 사용자만 접근)
-- 경로 규칙: {auth.uid()}/{unique-file-name}

drop policy if exists "clinical_media_insert_authenticated_owner" on storage.objects;
create policy "clinical_media_insert_authenticated_owner"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'clinical_media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "clinical_media_select_authenticated_owner" on storage.objects;
create policy "clinical_media_select_authenticated_owner"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'clinical_media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "clinical_media_update_authenticated_owner" on storage.objects;
create policy "clinical_media_update_authenticated_owner"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'clinical_media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'clinical_media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "clinical_media_delete_authenticated_owner" on storage.objects;
create policy "clinical_media_delete_authenticated_owner"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'clinical_media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

