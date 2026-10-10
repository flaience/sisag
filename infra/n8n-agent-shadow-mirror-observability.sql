begin;

create table if not exists public.n8n_agent_shadow_mirror_observations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  correlation_id varchar(240) not null,
  status varchar(32) not null check (status in ('accepted','rejected','transport_failed','configuration_error')),
  duration_ms integer not null check (duration_ms between 0 and 30000),
  policy_version varchar(64) not null,
  observed_at timestamptz not null default now(),
  unique(company_id, correlation_id)
);

create index if not exists n8n_agent_shadow_mirror_company_observed_idx
  on public.n8n_agent_shadow_mirror_observations(company_id, observed_at desc);

alter table public.n8n_agent_shadow_mirror_observations enable row level security;

commit;
