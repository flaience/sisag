begin;
alter type booking_event_type add value if not exists 'automation.booking_recovery.response_acknowledged';
alter table public.booking_recovery_responses add column if not exists acknowledged_by uuid;
alter table public.booking_recovery_responses add column if not exists acknowledged_at timestamptz;
create index if not exists booking_recovery_responses_company_attention_idx on public.booking_recovery_responses(company_id, needs_attention, acknowledged_at, created_at);
commit;
