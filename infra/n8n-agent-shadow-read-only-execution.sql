begin;
alter table public.n8n_agent_shadow_mirror_observations
  add column if not exists tool_execution_status varchar(24),
  add column if not exists tool_error_code varchar(64),
  add column if not exists tool_policy_version varchar(80);
alter table public.n8n_agent_shadow_mirror_observations
  drop constraint if exists n8n_agent_shadow_tool_status_check,
  add constraint n8n_agent_shadow_tool_status_check check (tool_execution_status is null or tool_execution_status in ('skipped','succeeded','failed'));
commit;
