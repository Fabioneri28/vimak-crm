-- ============================================================
-- VIMAK CRM V6.24.13 — RENTABILIDADE + CUSTOS DE FUNCIONÁRIOS
-- Execute UMA VEZ no Supabase SQL Editor.
-- Idempotente / multiempresa / RLS.
-- ============================================================
create table if not exists public.profitability_projects(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 client_id uuid references public.clients(id) on delete set null, proposal_id uuid references public.proposals(id) on delete set null,
 project_date date not null default current_date, client_name text not null, environment text not null,
 sale_value numeric(14,2) not null default 0, material_cost numeric(14,2) not null default 0,
 fixed_cost numeric(14,2) not null default 0, extra_cost numeric(14,2) not null default 0,
 operational_cost numeric(14,2) not null default 0, notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.profitability_assets(
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,
 category text not null,asset_name text not null,quantity numeric(12,2) not null default 1,unit_value numeric(14,2) not null default 0,
 annual_depreciation_rate numeric(8,4) not null default 10,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.profitability_personal_expenses(
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,
 category text not null,expense_name text not null,monthly_value numeric(14,2) not null default 0,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.profitability_settings(
 id uuid primary key default gen_random_uuid(),company_id uuid not null unique references public.companies(id) on delete cascade,
 rent_cost numeric(14,2) not null default 0,fixed_operational_cost numeric(14,2) not null default 0,
 variable_operational_cost numeric(14,2) not null default 0,extra_reserve numeric(14,2) not null default 0,
 team_override numeric(14,2),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.team_cost_members(
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,
 name text not null,contract_type text not null default 'CLT',admission_date date not null default current_date,
 base_salary numeric(14,2) not null default 0,transport_cost numeric(14,2) not null default 0,benefits_cost numeric(14,2) not null default 0,
 active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.team_cost_settings(
 id uuid primary key default gen_random_uuid(),company_id uuid not null unique references public.companies(id) on delete cascade,
 company_tax_regime text not null default 'Simples Nacional',inss_rate numeric(10,6) not null default 0,
 fgts_rate numeric(10,6) not null default .08,vacation_rate numeric(10,6) not null default .1111,
 thirteenth_rate numeric(10,6) not null default .0833,termination_rate numeric(10,6) not null default .04,
 other_rate numeric(10,6) not null default .0793,hours_month numeric(8,2) not null default 220,use_full_clt boolean not null default true,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now());

create index if not exists idx_profitability_projects_company_date on public.profitability_projects(company_id,project_date desc);
create index if not exists idx_team_cost_members_company on public.team_cost_members(company_id,name);

alter table public.profitability_projects enable row level security;
alter table public.profitability_assets enable row level security;
alter table public.profitability_personal_expenses enable row level security;
alter table public.profitability_settings enable row level security;
alter table public.team_cost_members enable row level security;
alter table public.team_cost_settings enable row level security;

do $$ declare t text; begin
 foreach t in array array['profitability_projects','profitability_assets','profitability_personal_expenses','profitability_settings','team_cost_members','team_cost_settings'] loop
  execute format('drop policy if exists tenant_isolation on public.%I',t);
  execute format('create policy tenant_isolation on public.%I for all to authenticated using(company_id=public.current_company_id()) with check(company_id=public.current_company_id())',t);
 end loop;
end $$;

grant select,insert,update,delete on public.profitability_projects,public.profitability_assets,public.profitability_personal_expenses,public.profitability_settings,public.team_cost_members,public.team_cost_settings to authenticated;
notify pgrst,'reload schema';
select to_regclass('public.profitability_projects') as rentabilidade, to_regclass('public.team_cost_members') as custos_equipe;
