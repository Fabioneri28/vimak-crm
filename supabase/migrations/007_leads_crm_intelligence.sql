-- V6.20 Leads & CRM Intelligence — sobre base estável V6.19
alter table public.leads add column if not exists stage text default 'Entrada';
alter table public.leads add column if not exists source text;
alter table public.leads add column if not exists temperature text default 'Morno';
alter table public.leads add column if not exists owner_name text;
alter table public.leads add column if not exists estimated_value numeric(16,2) default 0;
alter table public.leads add column if not exists probability numeric(6,2) default 0;
alter table public.leads add column if not exists score integer default 0;
alter table public.leads add column if not exists last_contact_at timestamptz;
alter table public.leads add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.leads add column if not exists updated_at timestamptz not null default now();

create table if not exists public.lead_activities (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 lead_id uuid not null references public.leads(id) on delete cascade,
 type text not null default 'note',
 title text not null,
 description text,
 created_by uuid references auth.users(id) on delete set null,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create table if not exists public.lead_tasks (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 lead_id uuid not null references public.leads(id) on delete cascade,
 title text not null,
 due_at timestamptz not null,
 priority text default 'Normal',
 status text default 'Pendente',
 notes text,
 created_by uuid references auth.users(id) on delete set null,
 completed_at timestamptz,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists idx_leads_company_stage on public.leads(company_id,stage);
create index if not exists idx_lead_activities_lead_date on public.lead_activities(company_id,lead_id,created_at desc);
create index if not exists idx_lead_tasks_due on public.lead_tasks(company_id,status,due_at);
alter table public.lead_activities enable row level security;
alter table public.lead_tasks enable row level security;
drop policy if exists tenant_lead_activities on public.lead_activities;
create policy tenant_lead_activities on public.lead_activities for all to authenticated
using(company_id=public.current_company_id()) with check(company_id=public.current_company_id());
drop policy if exists tenant_lead_tasks on public.lead_tasks;
create policy tenant_lead_tasks on public.lead_tasks for all to authenticated
using(company_id=public.current_company_id()) with check(company_id=public.current_company_id());
grant all on public.lead_activities,public.lead_tasks to authenticated,service_role;
