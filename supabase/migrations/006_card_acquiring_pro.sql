-- V6.19 Maquininhas & Taxas PRO
-- Estrutura aditiva; não apaga registros existentes.

alter table public.card_machines add column if not exists provider text;
alter table public.card_machines add column if not exists model text;
alter table public.card_machines add column if not exists terminal_code text;
alter table public.card_machines add column if not exists merchant_code text;
alter table public.card_machines add column if not exists notes text;
alter table public.card_machines add column if not exists active boolean not null default true;

create table if not exists public.card_machine_rates (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 card_machine_id uuid not null references public.card_machines(id) on delete cascade,
 payment_type text not null,
 card_brand text default 'Todas',
 installments int not null default 1 check(installments between 1 and 24),
 rate_pct numeric(9,4) not null default 0,
 fixed_fee numeric(14,2) not null default 0,
 settlement_days int not null default 0,
 valid_from date not null default current_date,
 valid_to date,
 active boolean not null default true,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);

create table if not exists public.card_transactions (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 card_machine_id uuid not null references public.card_machines(id) on delete restrict,
 sold_at timestamptz not null default now(),
 payment_type text not null,
 card_brand text,
 installments int not null default 1,
 gross_amount numeric(16,2) not null,
 rate_pct numeric(9,4) not null default 0,
 fee_amount numeric(16,2) not null default 0,
 net_amount numeric(16,2) not null,
 nsu text,
 authorization_code text,
 status text default 'Pendente',
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);

create table if not exists public.card_settlements (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 card_transaction_id uuid references public.card_transactions(id) on delete cascade,
 card_machine_id uuid not null references public.card_machines(id) on delete restrict,
 expected_at timestamptz not null,
 settled_at timestamptz,
 gross_amount numeric(16,2) not null default 0,
 fee_amount numeric(16,2) not null default 0,
 net_amount numeric(16,2) not null default 0,
 status text default 'Previsto',
 bank_reference text,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);

create index if not exists idx_card_rates_lookup on public.card_machine_rates(company_id,card_machine_id,payment_type,installments,active);
create index if not exists idx_card_tx_date on public.card_transactions(company_id,sold_at);
create index if not exists idx_card_settlement_due on public.card_settlements(company_id,expected_at,status);

alter table public.card_machine_rates enable row level security;
alter table public.card_transactions enable row level security;
alter table public.card_settlements enable row level security;

drop policy if exists tenant_card_machine_rates on public.card_machine_rates;
create policy tenant_card_machine_rates on public.card_machine_rates for all to authenticated
using(company_id=public.current_company_id()) with check(company_id=public.current_company_id());
drop policy if exists tenant_card_transactions on public.card_transactions;
create policy tenant_card_transactions on public.card_transactions for all to authenticated
using(company_id=public.current_company_id()) with check(company_id=public.current_company_id());
drop policy if exists tenant_card_settlements on public.card_settlements;
create policy tenant_card_settlements on public.card_settlements for all to authenticated
using(company_id=public.current_company_id()) with check(company_id=public.current_company_id());

grant all on public.card_machine_rates,public.card_transactions,public.card_settlements to authenticated,service_role;
