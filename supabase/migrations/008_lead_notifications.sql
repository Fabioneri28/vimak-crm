-- ============================================================
-- VIMAK CRM V6.24.9 — Notificações de Novo Lead
-- Execute UMA VEZ no Supabase SQL Editor.
-- ============================================================

create table if not exists public.crm_notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  type text not null default 'new_lead',
  title text not null,
  message text,
  severity text default 'normal',
  read_at timestamptz,
  whatsapp_status text,
  whatsapp_message_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_crm_notifications_company_created
  on public.crm_notifications(company_id, created_at desc);

create index if not exists idx_crm_notifications_company_unread
  on public.crm_notifications(company_id, read_at);

alter table public.crm_notifications enable row level security;

drop policy if exists tenant_isolation on public.crm_notifications;
create policy tenant_isolation
on public.crm_notifications
for all
to authenticated
using (company_id=public.current_company_id())
with check (company_id=public.current_company_id());

grant select,insert,update,delete on public.crm_notifications to authenticated;

create or replace function public.create_new_lead_notification()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_env text;
  v_severity text;
begin
  -- Notifica principalmente os leads vindos da captura pública.
  if coalesce(new.source,'') <> 'WhatsApp / Formulário' then
    return new;
  end if;

  v_env = array_to_string(coalesce(new.environments,'{}'::text[]), ', ');
  v_severity = case when coalesce(new.score,0) >= 75 then 'hot' else 'normal' end;

  insert into public.crm_notifications(
    company_id,lead_id,type,title,message,severity,metadata
  ) values (
    new.company_id,
    new.id,
    'new_lead',
    'Novo lead: '||coalesce(new.name,'Cliente'),
    concat_ws(' • ',
      nullif(new.whatsapp,''),
      nullif(new.city,''),
      nullif(v_env,''),
      case when coalesce(new.estimated_investment,0)>0
        then 'Invest. R$ '||to_char(new.estimated_investment,'FM999G999G990D00')
      end,
      'Score '||coalesce(new.score,0)
    ),
    v_severity,
    jsonb_build_object(
      'source',new.source,
      'classification',new.classification,
      'desired_deadline',new.desired_deadline
    )
  );

  return new;
end $$;

drop trigger if exists trg_new_lead_notification on public.leads;
create trigger trg_new_lead_notification
after insert on public.leads
for each row execute function public.create_new_lead_notification();

-- Habilita Realtime da tabela, sem falhar se ela já estiver adicionada.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='crm_notifications'
  ) then
    alter publication supabase_realtime add table public.crm_notifications;
  end if;
end $$;

notify pgrst, 'reload schema';

-- Diagnóstico final
select
  to_regclass('public.crm_notifications') as tabela_notificacoes,
  exists(
    select 1 from pg_trigger
    where tgname='trg_new_lead_notification'
      and not tgisinternal
  ) as trigger_ativo;
