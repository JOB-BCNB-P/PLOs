-- Clinical Aurora / PLOs Assessment System
-- Private storage for assessment evidence. Files are never public and access remains authenticated.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'plo-evidence',
  'plo-evidence',
  false,
  20971520,
  array['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Editors upload owned evidence files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'plo-evidence'
  and owner_id = (select auth.uid())::text
  and (select public.current_user_can_edit())
);

create policy "Owners or privileged users read evidence files"
on storage.objects for select to authenticated
using (
  bucket_id = 'plo-evidence'
  and (owner_id = (select auth.uid())::text or (select public.is_privileged()))
);

create policy "Owners or privileged users update evidence files"
on storage.objects for update to authenticated
using (
  bucket_id = 'plo-evidence'
  and (owner_id = (select auth.uid())::text or (select public.is_privileged()))
)
with check (
  bucket_id = 'plo-evidence'
  and (owner_id = (select auth.uid())::text or (select public.is_privileged()))
);

create policy "Owners or privileged users delete evidence files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'plo-evidence'
  and (owner_id = (select auth.uid())::text or (select public.is_privileged()))
);
