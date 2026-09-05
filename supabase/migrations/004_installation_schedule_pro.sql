-- V6.17 Agenda de Montagem PRO
-- Migração aditiva; preserva agendamentos existentes.
alter table public.installation_schedule
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_installation_schedule_company_start
  on public.installation_schedule(company_id, starts_at);

create index if not exists idx_installation_schedule_team_window
  on public.installation_schedule(company_id, team_id, starts_at, ends_at);

comment on column public.installation_schedule.metadata is
'V6.17: ambientes, cidade, contato, telefone, volumes, dias previstos e checklist pré-montagem.';
