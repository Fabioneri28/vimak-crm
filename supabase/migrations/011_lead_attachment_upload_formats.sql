-- VIMAK CRM V6.24.13.2
-- Corrige/expande upload público de anexos da captura de leads.

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'lead-attachments',
  'lead-attachments',
  false,
  20971520,
  array[
    'image/jpeg','image/png','image/webp','image/heic','image/heif',
    'application/pdf','text/plain','text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/acad','application/x-acad','application/dwg','image/vnd.dwg',
    'application/dxf','image/vnd.dxf',
    'application/zip','application/x-zip-compressed',
    'application/octet-stream'
  ]::text[]
)
on conflict (id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "public_lead_upload" on storage.objects;
create policy "public_lead_upload"
on storage.objects for insert
to anon
with check (bucket_id='lead-attachments');

drop policy if exists "authenticated_lead_upload" on storage.objects;
create policy "authenticated_lead_upload"
on storage.objects for insert
to authenticated
with check (bucket_id='lead-attachments');

drop policy if exists "authenticated_lead_read" on storage.objects;
create policy "authenticated_lead_read"
on storage.objects for select
to authenticated
using (bucket_id='lead-attachments');

drop policy if exists "authenticated_lead_delete" on storage.objects;
create policy "authenticated_lead_delete"
on storage.objects for delete
to authenticated
using (bucket_id='lead-attachments');

notify pgrst, 'reload schema';

select id,name,public,file_size_limit,allowed_mime_types
from storage.buckets
where id='lead-attachments';
