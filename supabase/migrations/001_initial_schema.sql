-- VIMAK CRM V5 CLOUD READY — Supabase/PostgreSQL
create extension if not exists "pgcrypto";

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;

create table public.companies (
 id uuid primary key default gen_random_uuid(), name text not null, legal_name text, document text, email text, phone text,
 address jsonb not null default '{}'::jsonb, slug text unique not null, plan text not null default 'trial', logo_url text,
 status text not null default 'active', settings jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade, company_id uuid not null references public.companies(id) on delete cascade,
 name text not null, email text, role text not null default 'Vendedor', permissions jsonb not null default '[]'::jsonb, active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index idx_profiles_company on public.profiles(company_id);

create or replace function public.current_company_id() returns uuid language sql stable security definer set search_path=public as $$ select company_id from public.profiles where id=auth.uid() $$;
create or replace function public.current_role() returns text language sql stable security definer set search_path=public as $$ select role from public.profiles where id=auth.uid() $$;

create table public.clients (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, name text not null, type text default 'Pessoa Física',
 document text, phone text, whatsapp text, email text, city text, neighborhood text, address jsonb not null default '{}'::jsonb, notes text, status text not null default 'Ativo',
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index idx_clients_company_name on public.clients(company_id,name);

create table public.leads (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, client_id uuid references public.clients(id) on delete set null,
 name text not null, whatsapp text, email text, city text, neighborhood text, source text, best_contact_time text, environments text[] not null default '{}', approximate_area numeric(12,2),
 has_project boolean default false, attachment_url text, desired_deadline text, estimated_investment numeric(14,2) default 0, property_status text, decision_maker text, notes text,
 score int not null default 50 check(score between 0 and 100), classification text default 'WARM', stage text not null default 'Entrada', lost_reason text, owner_id uuid references auth.users(id) on delete set null,
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index idx_leads_company_stage on public.leads(company_id,stage);

create table public.suppliers (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, name text not null, type text, document text, contact_name text, phone text, email text, website text, notes text, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.partners (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, name text not null, type text, phone text, email text, commission_rate numeric(8,4) default 0, pix_key text, notes text, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.inputs (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, supplier_id uuid references public.suppliers(id) on delete set null, name text not null, sku text, type text, unit text, unit_cost numeric(14,4) default 0, stock_qty numeric(14,4) default 0, min_stock numeric(14,4) default 0, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.proposals (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, client_id uuid references public.clients(id) on delete set null, lead_id uuid references public.leads(id) on delete set null, partner_id uuid references public.partners(id) on delete set null,
 number bigint generated always as identity, title text not null, status text not null default 'Orçado', subtotal numeric(14,2) default 0, discount numeric(14,2) default 0, assembly_fee numeric(14,2) default 0, freight numeric(14,2) default 0, total numeric(14,2) default 0,
 payment_terms text, delivery_days int, warranty_months int default 60, notes text, valid_until date, approved_at timestamptz, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index idx_proposals_company_status on public.proposals(company_id,status);

create table public.proposal_items (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, proposal_id uuid not null references public.proposals(id) on delete cascade, description text not null, environment text, qty numeric(14,4) not null default 1, unit text default 'un', unit_price numeric(14,2) default 0, cost numeric(14,2) default 0, total numeric(14,2) default 0, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.proposal_models (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, name text not null, environments text[] default '{}', body jsonb not null default '{}'::jsonb, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.measurements (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, client_id uuid references public.clients(id) on delete set null, proposal_id uuid references public.proposals(id) on delete set null, environments text[] default '{}', measurements jsonb not null default '{}'::jsonb, attachments jsonb not null default '[]'::jsonb, measured_at timestamptz default now(), responsible_id uuid references auth.users(id) on delete set null, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.purchase_orders (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, supplier_id uuid references public.suppliers(id) on delete set null, proposal_id uuid references public.proposals(id) on delete set null, status text not null default 'Aberto', total numeric(14,2) default 0, invoice_key text, xml_url text, notes text, ordered_at timestamptz default now(), expected_at timestamptz, received_at timestamptz, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.purchase_order_items (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade, input_id uuid references public.inputs(id) on delete set null, description text not null, qty numeric(14,4) default 1, unit_cost numeric(14,4) default 0, total numeric(14,2) default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.document_templates (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, name text not null, type text not null, content text not null default '', variables jsonb not null default '[]'::jsonb, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.production_projects (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, proposal_id uuid references public.proposals(id) on delete set null, client_id uuid references public.clients(id) on delete set null, title text not null, stage text not null default 'Orçado', progress int not null default 0 check(progress between 0 and 100), priority text default 'Normal', due_date date, responsible_id uuid references auth.users(id) on delete set null, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.cutting_plans (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, production_project_id uuid references public.production_projects(id) on delete set null, name text not null, source text default 'manual', file_url text, sheets_count int default 0, utilization_pct numeric(8,4) default 0, waste_pct numeric(8,4) default 0, status text default 'Rascunho', data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.sheet_remnants (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, cutting_plan_id uuid references public.cutting_plans(id) on delete set null, label text, material text not null, thickness_mm numeric(8,2), width_mm numeric(12,2), height_mm numeric(12,2), area_m2 numeric(14,4), origin text, status text default 'Disponível', storage_location text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.after_sales_tickets (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, client_id uuid references public.clients(id) on delete set null, proposal_id uuid references public.proposals(id) on delete set null, service_type text, description text not null, status text not null default 'Aberto', priority text default 'Normal', cost numeric(14,2) default 0, assigned_to uuid references auth.users(id) on delete set null, opened_at timestamptz not null default now(), closed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.integrations (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, provider text not null, status text not null default 'inactive', config jsonb not null default '{}'::jsonb, last_sync_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id,provider));
create table public.installation_teams (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, name text not null, responsible text, phone text, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.installation_schedule (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, proposal_id uuid references public.proposals(id) on delete set null, client_id uuid references public.clients(id) on delete set null, team_id uuid references public.installation_teams(id) on delete set null, job_address text, starts_at timestamptz not null, ends_at timestamptz, status text default 'Agendado', notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.cost_centers (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, name text not null, type text, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.bank_accounts (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, name text not null, bank text, agency text, account text, initial_balance numeric(14,2) default 0, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.accounts_receivable (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, proposal_id uuid references public.proposals(id) on delete set null, client_id uuid references public.clients(id) on delete set null, bank_account_id uuid references public.bank_accounts(id) on delete set null, cost_center_id uuid references public.cost_centers(id) on delete set null, description text not null, amount numeric(14,2) not null default 0, due_date date, paid_at timestamptz, status text default 'Aberto', payment_method text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.accounts_payable (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, supplier_id uuid references public.suppliers(id) on delete set null, proposal_id uuid references public.proposals(id) on delete set null, bank_account_id uuid references public.bank_accounts(id) on delete set null, cost_center_id uuid references public.cost_centers(id) on delete set null, description text not null, amount numeric(14,2) not null default 0, due_date date, paid_at timestamptz, status text default 'Aberto', payment_method text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.invoices (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, proposal_id uuid references public.proposals(id) on delete set null, client_id uuid references public.clients(id) on delete set null, number text, series text, access_key text, amount numeric(14,2) default 0, status text default 'Pendente', issued_at timestamptz, xml_url text, pdf_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.card_machines (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, name text not null, provider text, debit_rate numeric(8,4) default 0, credit_1x_rate numeric(8,4) default 0, installment_rates jsonb not null default '{}'::jsonb, settlement_days int default 1, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table public.audit_logs (id bigint generated always as identity primary key, company_id uuid references public.companies(id) on delete cascade, user_id uuid references auth.users(id) on delete set null, table_name text, record_id text, action text not null, old_data jsonb, new_data jsonb, created_at timestamptz not null default now());

-- Updated-at triggers
do $$ declare t text; begin foreach t in array array['companies','profiles','clients','leads','suppliers','partners','inputs','proposals','proposal_items','proposal_models','measurements','purchase_orders','purchase_order_items','document_templates','production_projects','cutting_plans','sheet_remnants','after_sales_tickets','integrations','installation_teams','installation_schedule','cost_centers','bank_accounts','accounts_receivable','accounts_payable','invoices','card_machines'] loop execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',t,t); end loop; end $$;

-- RLS
do $$ declare t text; begin foreach t in array array['companies','profiles','clients','leads','suppliers','partners','inputs','proposals','proposal_items','proposal_models','measurements','purchase_orders','purchase_order_items','document_templates','production_projects','cutting_plans','sheet_remnants','after_sales_tickets','integrations','installation_teams','installation_schedule','cost_centers','bank_accounts','accounts_receivable','accounts_payable','invoices','card_machines','audit_logs'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;

create policy company_select_own on public.companies for select using(id=public.current_company_id());
create policy company_update_admin on public.companies for update using(id=public.current_company_id() and public.current_role()='Administrador') with check(id=public.current_company_id() and public.current_role()='Administrador');
create policy profiles_read_tenant on public.profiles for select using(company_id=public.current_company_id());
create policy profiles_admin_manage on public.profiles for all using(company_id=public.current_company_id() and public.current_role()='Administrador') with check(company_id=public.current_company_id() and public.current_role()='Administrador');

do $$ declare t text; begin foreach t in array array['clients','leads','suppliers','partners','inputs','proposals','proposal_items','proposal_models','measurements','purchase_orders','purchase_order_items','document_templates','production_projects','cutting_plans','sheet_remnants','after_sales_tickets','integrations','installation_teams','installation_schedule','cost_centers','bank_accounts','accounts_receivable','accounts_payable','invoices','card_machines','audit_logs'] loop execute format('create policy tenant_isolation on public.%I for all using(company_id=public.current_company_id()) with check(company_id=public.current_company_id())',t); end loop; end $$;

-- Cria empresa + perfil do primeiro usuário autenticado.
create or replace function public.create_company_and_profile(p_company_name text,p_company_slug text,p_user_name text) returns uuid language plpgsql security definer set search_path=public as $$
declare v_company_id uuid; begin
 if auth.uid() is null then raise exception 'Usuário não autenticado'; end if;
 if exists(select 1 from public.profiles where id=auth.uid()) then raise exception 'Usuário já possui empresa'; end if;
 insert into public.companies(name,slug,plan,status) values(p_company_name,p_company_slug,'trial','active') returning id into v_company_id;
 insert into public.profiles(id,company_id,name,email,role,permissions,active) values(auth.uid(),v_company_id,p_user_name,auth.jwt()->>'email','Administrador','["*"]'::jsonb,true);
 return v_company_id;
end $$;
revoke all on function public.create_company_and_profile(text,text,text) from public;
grant execute on function public.create_company_and_profile(text,text,text) to authenticated;

create view public.v_sales_pipeline with (security_invoker=true) as select company_id,stage,count(*) leads_count,coalesce(sum(estimated_investment),0) potential_value from public.leads group by company_id,stage;
create view public.v_financial_summary with (security_invoker=true) as select c.id company_id, coalesce((select sum(amount) from public.accounts_receivable r where r.company_id=c.id and status<>'Pago'),0) a_receber, coalesce((select sum(amount) from public.accounts_payable p where p.company_id=c.id and status<>'Pago'),0) a_pagar from public.companies c;
