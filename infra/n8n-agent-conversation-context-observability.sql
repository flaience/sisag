begin;
alter table public.n8n_agent_shadow_mirror_observations
  add column if not exists context_continued boolean not null default false;
commit;
