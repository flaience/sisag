begin;
alter type public.booking_event_type add value if not exists 'automation.booking_followup.responded';
create unique index if not exists bookings_company_id_id_uq on public.bookings(company_id, id);
create unique index if not exists clients_company_id_id_uq on public.clients(company_id, id);
create table if not exists public.booking_feedbacks (
  id uuid primary key default gen_random_uuid(), company_id uuid not null, booking_id uuid not null, client_id uuid not null,
  score integer not null, source varchar(16) not null default 'whatsapp', correlation_id varchar(160), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint booking_feedbacks_company_fk foreign key (company_id) references public.companies(id) on delete cascade,
  constraint booking_feedbacks_booking_company_fk foreign key (company_id, booking_id) references public.bookings(company_id, id) on delete cascade,
  constraint booking_feedbacks_client_company_fk foreign key (company_id, client_id) references public.clients(company_id, id) on delete cascade,
  constraint booking_feedbacks_score_check check (score between 1 and 5),
  constraint booking_feedbacks_source_check check (source in ('whatsapp','panel','api')),
  constraint booking_feedbacks_company_booking_uq unique (company_id, booking_id)
);
create index if not exists booking_feedbacks_company_created_idx on public.booking_feedbacks(company_id, created_at desc);
alter table public.booking_feedbacks enable row level security;
commit;
