-- VIMAK CRM V6.24.5 — Persistência Total
-- Idempotente: cria somente estruturas financeiras enterprise ausentes. Não apaga dados.

create table if not exists public.finance_entities (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 name text not null, legal_name text, country text default 'Brasil',
 currency text default 'BRL', tax_id text, active boolean default true,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.finance_budgets (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 entity_id uuid references public.finance_entities(id) on delete set null,
 name text not null, year integer not null, version integer default 1,
 currency text default 'BRL', status text default 'Rascunho', notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.finance_budget_items (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 budget_id uuid not null references public.finance_budgets(id) on delete cascade,
 cost_center_id uuid references public.cost_centers(id) on delete set null,
 month integer, category text, planned_amount numeric(16,2) default 0,
 actual_amount numeric(16,2) default 0, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);

create table if not exists public.finance_transactions (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 entity_id uuid references public.finance_entities(id) on delete set null,
 bank_account_id uuid references public.bank_accounts(id) on delete set null,
 cost_center_id uuid references public.cost_centers(id) on delete set null,
 transaction_date date not null default current_date, description text not null,
 type text not null, amount numeric(16,2) not null default 0, currency text default 'BRL',
 status text default 'Confirmado', external_ref text, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.finance_approvals (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 request_type text not null, reference_id uuid, amount numeric(16,2) default 0,
 status text default 'Pendente', requested_by uuid references auth.users(id) on delete set null,
 approved_by uuid references auth.users(id) on delete set null, approved_at timestamptz,
 notes text, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.finance_entities enable row level security;
alter table public.finance_budgets enable row level security;
alter table public.finance_budget_items enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.finance_approvals enable row level security;

do $$
declare t text;
begin
 foreach t in array array['finance_entities','finance_budgets','finance_budget_items','finance_transactions','finance_approvals']
 loop
  execute format('drop policy if exists tenant_isolation on public.%I',t);
  execute format('create policy tenant_isolation on public.%I for all to authenticated using(company_id=public.current_company_id()) with check(company_id=public.current_company_id())',t);
 end loop;
end $$;

grant select,insert,update,delete on public.finance_entities,public.finance_budgets,public.finance_budget_items,public.finance_transactions,public.finance_approvals to authenticated;
