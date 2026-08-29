begin;

create table if not exists public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  unit_id uuid,
  professional_id uuid,
  kind varchar(24) not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  reason varchar(240) not null,
  status varchar(16) not null default 'active',
  created_by uuid,
  revoked_at timestamptz,
  revoked_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_exceptions_company_fk foreign key (company_id) references public.companies(id) on delete cascade,
  constraint availability_exceptions_unit_company_fk foreign key (company_id, unit_id) references public.company_units(company_id, id) on delete cascade,
  constraint availability_exceptions_professional_company_fk foreign key (company_id, professional_id) references public.professionals(company_id, id) on delete cascade,
  constraint availability_exceptions_professional_unit_fk foreign key (company_id, professional_id, unit_id) references public.professional_units(company_id, professional_id, unit_id) on delete cascade,
  constraint availability_exceptions_kind_check check (kind in ('holiday', 'closure', 'absence', 'block')),
  constraint availability_exceptions_period_check check (ends_at > starts_at),
  constraint availability_exceptions_reason_check check (length(trim(reason)) between 2 and 240),
  constraint availability_exceptions_status_check check (status in ('active', 'revoked')),
  constraint availability_exceptions_target_check check (
    (kind in ('holiday', 'closure') and professional_id is null)
    or (kind in ('absence', 'block') and professional_id is not null)
  ),
  constraint availability_exceptions_revocation_check check (
    (status = 'active' and revoked_at is null and revoked_by is null)
    or (status = 'revoked' and revoked_at is not null)
  )
);

create index if not exists availability_exceptions_company_active_period_idx
  on public.availability_exceptions (company_id, starts_at, ends_at)
  where status = 'active';
create index if not exists availability_exceptions_company_unit_active_period_idx
  on public.availability_exceptions (company_id, unit_id, starts_at, ends_at)
  where status = 'active' and unit_id is not null;
create index if not exists availability_exceptions_company_professional_active_period_idx
  on public.availability_exceptions (company_id, professional_id, starts_at, ends_at)
  where status = 'active' and professional_id is not null;
create index if not exists availability_exceptions_company_history_idx
  on public.availability_exceptions (company_id, status, created_at desc);

alter table public.availability_exceptions enable row level security;

commit;
