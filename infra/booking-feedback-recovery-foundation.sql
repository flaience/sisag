begin;
alter type booking_event_type add value if not exists 'automation.booking_recovery.opened';
alter type booking_event_type add value if not exists 'automation.booking_recovery.closed';
create table if not exists public.booking_recovery_cases (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade, client_id uuid not null references public.clients(id) on delete cascade,
  feedback_id uuid not null references public.booking_feedbacks(id) on delete cascade, score integer not null check (score between 1 and 2),
  priority varchar(16) not null default 'high' check (priority in ('high','urgent')),
  status varchar(20) not null default 'open' check (status in ('open','contacted','resolved','dismissed')),
  assigned_to uuid, resolution_note text, opened_at timestamptz not null default now(), contacted_at timestamptz,
  resolved_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (company_id, booking_id)
);
create index if not exists booking_recovery_cases_company_status_idx on public.booking_recovery_cases(company_id, status, opened_at);
create index if not exists booking_recovery_cases_company_client_idx on public.booking_recovery_cases(company_id, client_id);
alter table public.booking_recovery_cases enable row level security;
commit;
