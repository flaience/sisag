begin;
alter type booking_event_type add value if not exists 'automation.booking_recovery.draft_created';
create table if not exists public.booking_recovery_drafts (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 recovery_case_id uuid not null references public.booking_recovery_cases(id) on delete cascade,
 booking_id uuid not null references public.bookings(id) on delete cascade, client_id uuid not null references public.clients(id) on delete cascade,
 status varchar(20) not null default 'pending_review' check (status in ('pending_review','approved','rejected','sent')),
 message text not null, rationale text not null, tone varchar(24) not null default 'empathetic', objective varchar(32) not null default 'recover_trust',
 generator varchar(40) not null default 'recovery_rules_v1', version integer not null default 1, context_snapshot jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(company_id, recovery_case_id)
);
create index if not exists booking_recovery_drafts_company_status_idx on public.booking_recovery_drafts(company_id, status, updated_at);
alter table public.booking_recovery_drafts enable row level security;
commit;
