-- V6.16 Equipes de Montagem PRO
-- Migração aditiva e compatível com registros existentes.
alter table public.installation_teams
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_installation_teams_company_active
  on public.installation_teams(company_id, active);

create index if not exists idx_installation_schedule_team_start
  on public.installation_schedule(company_id, team_id, starts_at);

comment on column public.installation_teams.metadata is
'V6.16: status operacional, capacidade, custo/dia, veículo, região, especialidades, avaliação, meta de qualidade, integrantes e checklists.';
