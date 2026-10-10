begin;

alter table public.n8n_agent_shadow_mirror_observations
  add column if not exists decision_action varchar(40),
  add column if not exists tool_name varchar(80),
  add column if not exists reason_code varchar(64),
  add column if not exists confidence_milli integer,
  add column if not exists execution_mode varchar(16),
  add column if not exists provider varchar(40),
  add column if not exists model varchar(80),
  add column if not exists prompt_version varchar(80),
  add column if not exists model_duration_ms integer,
  add column if not exists model_error_code varchar(64);

alter table public.n8n_agent_shadow_mirror_observations
  drop constraint if exists n8n_agent_shadow_decision_action_check,
  add constraint n8n_agent_shadow_decision_action_check check (decision_action is null or decision_action in ('answer_from_knowledge','request_read_only_tool','clarify','handoff')),
  drop constraint if exists n8n_agent_shadow_confidence_check,
  add constraint n8n_agent_shadow_confidence_check check (confidence_milli is null or confidence_milli between 0 and 1000),
  drop constraint if exists n8n_agent_shadow_execution_mode_check,
  add constraint n8n_agent_shadow_execution_mode_check check (execution_mode is null or execution_mode in ('ai','fallback')),
  drop constraint if exists n8n_agent_shadow_model_duration_check,
  add constraint n8n_agent_shadow_model_duration_check check (model_duration_ms is null or model_duration_ms between 0 and 30000);

commit;
