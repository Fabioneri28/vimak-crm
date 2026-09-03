-- VIMAK Storage
insert into storage.buckets(id,name,public) values('company-logos','company-logos',true),('crm-documents','crm-documents',false) on conflict(id) do nothing;
create policy public_logo_read on storage.objects for select using(bucket_id='company-logos');
create policy tenant_logo_write on storage.objects for all to authenticated using(bucket_id='company-logos' and (storage.foldername(name))[1]=public.current_company_id()::text) with check(bucket_id='company-logos' and (storage.foldername(name))[1]=public.current_company_id()::text);
create policy tenant_documents on storage.objects for all to authenticated using(bucket_id='crm-documents' and (storage.foldername(name))[1]=public.current_company_id()::text) with check(bucket_id='crm-documents' and (storage.foldername(name))[1]=public.current_company_id()::text);
