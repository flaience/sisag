begin;

create table if not exists public.service_booking_assignment_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  unit_id uuid not null,
  service_id uuid,
  professional_id uuid not null,
  weekday integer not null,
  start_time text not null,
  end_time text not null,
  priority integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_booking_assignment_rules_unit_company_fk
    foreign key (company_id, unit_id)
    references public.company_units(company_id, id) on delete cascade,
  constraint service_booking_assignment_rules_professional_unit_fk
    foreign key (company_id, professional_id, unit_id)
    references public.professional_units(company_id, professional_id, unit_id) on delete cascade,
  constraint service_booking_assignment_rules_professional_service_fk
    foreign key (company_id, professional_id, service_id)
    references public.professional_services(company_id, professional_id, service_id) on delete cascade,
  constraint service_booking_assignment_rules_weekday_check
    check (weekday between 0 and 6),
  constraint service_booking_assignment_rules_time_format_check
    check (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  constraint service_booking_assignment_rules_time_order_check
    check (start_time < end_time),
  constraint service_booking_assignment_rules_priority_check
    check (priority between 1 and 1000)
);

create unique index if not exists service_booking_assignment_rules_specific_uq
  on public.service_booking_assignment_rules
    (company_id, unit_id, service_id, weekday, start_time, end_time)
  where service_id is not null;

create unique index if not exists service_booking_assignment_rules_fallback_uq
  on public.service_booking_assignment_rules
    (company_id, unit_id, weekday, start_time, end_time)
  where service_id is null;

create index if not exists service_booking_assignment_rules_resolution_idx
  on public.service_booking_assignment_rules
    (company_id, unit_id, weekday, active, priority, start_time, end_time);

create index if not exists service_booking_assignment_rules_professional_idx
  on public.service_booking_assignment_rules
    (company_id, professional_id, active);

alter table public.service_booking_assignment_rules enable row level security;

commit;
