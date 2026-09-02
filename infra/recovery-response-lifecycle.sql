begin;
alter type booking_event_type add value if not exists 'automation.booking_recovery.responded';
alter type booking_event_type add value if not exists 'automation.booking_recovery.alert_requested';
create table if not exists public.booking_recovery_responses (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 recovery_case_id uuid not null references public.booking_recovery_cases(id) on delete cascade,
 draft_id uuid not null references public.booking_recovery_drafts(id) on delete cascade,
 booking_id uuid not null references public.bookings(id) on delete cascade, client_id uuid not null references public.clients(id) on delete cascade,
 provider_message_id varchar(180) not null, message text not null,
 classification varchar(24) not null default 'other' check (classification in ('positive','negative','human_request','other')),
 needs_attention boolean not null default true, created_at timestamptz not null default now(), unique(company_id, provider_message_id)
);
create index if not exists booking_recovery_responses_company_case_idx on public.booking_recovery_responses(company_id, recovery_case_id, created_at);
alter table public.booking_recovery_responses enable row level security;
commit;
