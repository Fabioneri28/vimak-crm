-- VIMAK CRM V6.24.8 — Captura Pública de Leads
-- Execute UMA VEZ no Supabase SQL Editor.
-- Não expõe service_role. O formulário público usa somente RPC controlada.

create or replace function public.capture_public_lead(
 p_company_id uuid,
 p_name text,
 p_whatsapp text,
 p_email text default null,
 p_city text default null,
 p_neighborhood text default null,
 p_best_contact_time text default null,
 p_environments text[] default '{}',
 p_approximate_area numeric default null,
 p_has_project boolean default false,
 p_attachment_url text default null,
 p_desired_deadline text default null,
 p_estimated_investment numeric default 0,
 p_property_status text default null,
 p_decision_maker text default null,
 p_notes text default null,
 p_score integer default 50,
 p_classification text default 'Lead',
 p_source text default 'WhatsApp / Formulário'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
 v_id uuid;
begin
 if p_name is null or length(trim(p_name)) < 2 then raise exception 'Nome inválido'; end if;
 if p_whatsapp is null or length(regexp_replace(p_whatsapp,'\D','','g')) < 10 then raise exception 'WhatsApp inválido'; end if;
 if not exists(select 1 from public.companies where id=p_company_id and status='active') then raise exception 'Empresa inválida'; end if;

 -- Evita duplicidade acidental do mesmo WhatsApp em poucos minutos.
 select id into v_id
 from public.leads
 where company_id=p_company_id
   and regexp_replace(coalesce(whatsapp,''),'\D','','g')=regexp_replace(p_whatsapp,'\D','','g')
   and created_at > now()-interval '5 minutes'
 order by created_at desc limit 1;

 if v_id is not null then return v_id; end if;

 insert into public.leads(
  company_id,name,whatsapp,email,city,neighborhood,source,best_contact_time,
  environments,approximate_area,has_project,attachment_url,desired_deadline,
  estimated_investment,property_status,decision_maker,notes,score,classification,
  stage,created_by
 ) values (
  p_company_id,trim(p_name),p_whatsapp,nullif(trim(coalesce(p_email,'')),''),
  nullif(trim(coalesce(p_city,'')),''),nullif(trim(coalesce(p_neighborhood,'')),''),
  p_source,p_best_contact_time,coalesce(p_environments,'{}'),p_approximate_area,
  p_has_project,p_attachment_url,p_desired_deadline,coalesce(p_estimated_investment,0),
  p_property_status,p_decision_maker,p_notes,greatest(0,least(100,coalesce(p_score,50))),
  p_classification,'Entrada',null
 )
 returning id into v_id;

 return v_id;
end $$;

revoke all on function public.capture_public_lead(uuid,text,text,text,text,text,text,text[],numeric,boolean,text,text,numeric,text,text,text,integer,text,text) from public;
grant execute on function public.capture_public_lead(uuid,text,text,text,text,text,text,text[],numeric,boolean,text,text,numeric,text,text,text,integer,text,text) to anon, authenticated;

-- Bucket privado para projetos/plantas enviados pelo formulário.
insert into storage.buckets(id,name,public)
values('lead-attachments','lead-attachments',false)
on conflict(id) do update set public=false;

drop policy if exists "public_lead_upload" on storage.objects;
create policy "public_lead_upload"
on storage.objects for insert
to anon
with check (bucket_id='lead-attachments');

drop policy if exists "authenticated_lead_read" on storage.objects;
create policy "authenticated_lead_read"
on storage.objects for select
to authenticated
using (bucket_id='lead-attachments');

notify pgrst, 'reload schema';
