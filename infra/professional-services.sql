begin;

create unique index if not exists services_company_id_id_uq
  on public.services(company_id, id);

create table if not exists public.professional_services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  professional_id uuid not null,
  service_id uuid not null,
  duration_override_minutes integer,
  price_override numeric,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint professional_services_professional_company_fk
    foreign key (company_id, professional_id)
    references public.professionals(company_id, id) on delete cascade,
  constraint professional_services_service_company_fk
    foreign key (company_id, service_id)
    references public.services(company_id, id) on delete cascade,
  constraint professional_services_duration_check
    check (duration_override_minutes is null or duration_override_minutes between 5 and 1440),
  constraint professional_services_price_check
    check (price_override is null or price_override >= 0)
);

create unique index if not exists professional_services_company_professional_service_uq
  on public.professional_services(company_id, professional_id, service_id);
create index if not exists professional_services_company_professional_active_idx
  on public.professional_services(company_id, professional_id, active);
create index if not exists professional_services_company_service_active_idx
  on public.professional_services(company_id, service_id, active);

alter table public.professional_services enable row level security;

commit;
