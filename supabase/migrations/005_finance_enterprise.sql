-- V6.18 Financeiro Enterprise
-- Additive extension. Existing finance tables remain intact.

alter table public.accounts_receivable add column if not exists cost_center_id uuid references public.cost_centers(id) on delete set null;
alter table public.accounts_receivable add column if not exists notes text;
alter table public.accounts_payable add column if not exists cost_center_id uuid references public.cost_centers(id) on delete set null;
alter table public.accounts_payable add column if not exists notes text;

create table if not exists public.finance_entities (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 name text not null,
 legal_name text,
 country text default 'Brasil',
 currency text default 'BRL',
 tax_id text,
 active boolean not null default true,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.finance_budgets (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 entity_id uuid references public.finance_entities(id) on delete set null,
 name text not null,
 year integer not null,
 version text default 'Original',
 currency text default 'BRL',
 status text default 'Rascunho',
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.finance_budget_items (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 budget_id uuid not null references public.finance_budgets(id) on delete cascade,
 cost_center_id uuid references public.cost_centers(id) on delete set null,
 month integer,
 category text,
 planned_amount numeric(16,2) default 0,
 actual_amount numeric(16,2) default 0,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);

create table if not exists public.finance_transactions (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 entity_id uuid references public.finance_entities(id) on delete set null,
 bank_account_id uuid references public.bank_accounts(id) on delete set null,
 cost_center_id uuid references public.cost_centers(id) on delete set null,
 transaction_date date not null default current_date,
 description text not null,
 type text not null,
 amount numeric(16,2) not null default 0,
 currency text default 'BRL',
 status text default 'Confirmado',
 external_ref text,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.finance_approvals (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 request_type text not null,
 reference_id uuid,
 amount numeric(16,2) default 0,
 status text default 'Pendente',
 requested_by uuid references auth.users(id) on delete set null,
 approved_by uuid references auth.users(id) on delete set null,
 approved_at timestamptz,
 notes text,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create index if not exists idx_fin_budget_company_year on public.finance_budgets(company_id,year);
create index if not exists idx_fin_tx_company_date on public.finance_transactions(company_id,transaction_date);
create index if not exists idx_fin_approval_company_status on public.finance_approvals(company_id,status);
create index if not exists idx_ar_company_due on public.accounts_receivable(company_id,due_date);
create index if not exists idx_ap_company_due on public.accounts_payable(company_id,due_date);

alter table public.finance_entities enable row level security;
alter table public.finance_budgets enable row level security;
alter table public.finance_budget_items enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.finance_approvals enable row level security;

drop policy if exists tenant_finance_entities on public.finance_entities;
create policy tenant_finance_entities on public.finance_entities for all to authenticated
using(company_id=public.current_company_id()) with check(company_id=public.current_company_id());
drop policy if exists tenant_finance_budgets on public.finance_budgets;
create policy tenant_finance_budgets on public.finance_budgets for all to authenticated
using(company_id=public.current_company_id()) with check(company_id=public.current_company_id());
drop policy if exists tenant_finance_budget_items on public.finance_budget_items;
create policy tenant_finance_budget_items on public.finance_budget_items for all to authenticated
using(company_id=public.current_company_id()) with check(company_id=public.current_company_id());
drop policy if exists tenant_finance_transactions on public.finance_transactions;
create policy tenant_finance_transactions on public.finance_transactions for all to authenticated
using(company_id=public.current_company_id()) with check(company_id=public.current_company_id());
drop policy if exists tenant_finance_approvals on public.finance_approvals;
create policy tenant_finance_approvals on public.finance_approvals for all to authenticated
using(company_id=public.current_company_id()) with check(company_id=public.current_company_id());

grant all on public.finance_entities,public.finance_budgets,public.finance_budget_items,public.finance_transactions,public.finance_approvals to authenticated,service_role;
