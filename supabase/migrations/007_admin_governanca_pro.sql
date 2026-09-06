-- VIMAK CRM V6.22 — Administração, Governança e Assinatura
create table if not exists public.team_invites(
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 name text not null,email text not null,role text not null default 'Vendedor',
 status text not null default 'Pendente',invite_token uuid not null default gen_random_uuid(),
 invited_by uuid references auth.users(id) on delete set null,
 expires_at timestamptz default (now()+interval '7 days'),
 accepted_at timestamptz,created_at timestamptz not null default now(),
 unique(company_id,email,status)
);
create table if not exists public.subscription_plans(
 code text primary key,name text not null,description text,monthly_price numeric(14,2) not null default 0,
 badge text,features jsonb not null default '[]'::jsonb,limits jsonb not null default '{}'::jsonb,
 active boolean not null default true,sort_order int not null default 0,created_at timestamptz not null default now()
);
create table if not exists public.company_subscriptions(
 id uuid primary key default gen_random_uuid(),company_id uuid not null unique references public.companies(id) on delete cascade,
 plan_code text not null references public.subscription_plans(code),status text not null default 'Ativa',
 started_at timestamptz not null default now(),renews_at timestamptz,canceled_at timestamptz,
 metadata jsonb not null default '{}'::jsonb,updated_at timestamptz not null default now()
);
create table if not exists public.subscription_requests(
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,
 requested_plan_code text not null references public.subscription_plans(code),status text not null default 'Pendente',
 requested_by uuid references auth.users(id) on delete set null,processed_by uuid references auth.users(id) on delete set null,
 processed_at timestamptz,notes text,created_at timestamptz not null default now()
);

alter table public.team_invites enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.company_subscriptions enable row level security;
alter table public.subscription_requests enable row level security;

drop policy if exists tenant_team_invites on public.team_invites;
create policy tenant_team_invites on public.team_invites for all to authenticated
using(company_id=public.current_company_id()) with check(company_id=public.current_company_id());

drop policy if exists read_subscription_plans on public.subscription_plans;
create policy read_subscription_plans on public.subscription_plans for select to authenticated using(active=true);

drop policy if exists tenant_company_subscriptions on public.company_subscriptions;
create policy tenant_company_subscriptions on public.company_subscriptions for select to authenticated
using(company_id=public.current_company_id());

drop policy if exists tenant_subscription_requests on public.subscription_requests;
create policy tenant_subscription_requests on public.subscription_requests for all to authenticated
using(company_id=public.current_company_id()) with check(company_id=public.current_company_id());

-- Administradores da mesma empresa podem gerenciar perfis.
drop policy if exists admin_manage_company_profiles on public.profiles;
create policy admin_manage_company_profiles on public.profiles for update to authenticated
using(company_id=public.current_company_id() and public.current_role() in ('Administrador','Admin','Owner'))
with check(company_id=public.current_company_id() and public.current_role() in ('Administrador','Admin','Owner'));

-- Leitura da equipe e auditoria da própria empresa.
drop policy if exists tenant_read_profiles on public.profiles;
create policy tenant_read_profiles on public.profiles for select to authenticated using(company_id=public.current_company_id());
drop policy if exists tenant_read_audit on public.audit_logs;
create policy tenant_read_audit on public.audit_logs for select to authenticated using(company_id=public.current_company_id());
drop policy if exists tenant_insert_audit on public.audit_logs;
create policy tenant_insert_audit on public.audit_logs for insert to authenticated with check(company_id=public.current_company_id());

insert into public.subscription_plans(code,name,description,monthly_price,badge,features,limits,sort_order) values
('essencial','Essencial','Para pequenas operações que querem centralizar o comercial e os cadastros.',149.90,'COMEÇAR',
 '["Dashboard e CRM","Clientes e propostas","Documentos","Suporte padrão"]'::jsonb,'{"users":3}'::jsonb,1),
('profissional','Profissional','Operação integrada do comercial à produção e financeiro.',299.90,'MAIS ESCOLHIDO',
 '["Tudo do Essencial","Produção e montagem","Financeiro completo","Maquininhas & Taxas","Até 10 usuários"]'::jsonb,'{"users":10}'::jsonb,2),
('premium','Premium','Gestão completa para marcenarias em expansão com governança e recursos avançados.',499.90,'GESTÃO 360',
 '["Tudo do Profissional","Usuários ilimitados","Auditoria avançada","Integrações","Prioridade de suporte"]'::jsonb,'{"users":9999}'::jsonb,3)
on conflict(code) do update set name=excluded.name,description=excluded.description,monthly_price=excluded.monthly_price,badge=excluded.badge,features=excluded.features,limits=excluded.limits,sort_order=excluded.sort_order,active=true;

insert into public.company_subscriptions(company_id,plan_code,status)
select id,
 case when plan in ('premium','profissional','essencial') then plan else 'profissional' end,
 'Ativa'
from public.companies
on conflict(company_id) do nothing;

grant select on public.subscription_plans to authenticated;
grant select,insert,update,delete on public.team_invites to authenticated;
grant select on public.company_subscriptions to authenticated;
grant select,insert on public.subscription_requests to authenticated;
