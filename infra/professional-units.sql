begin;

create unique index if not exists professionals_company_id_id_uq
  on public.professionals(company_id, id);
create unique index if not exists company_units_company_id_id_uq
  on public.company_units(company_id, id);

create table if not exists public.professional_units (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  professional_id uuid not null,
  unit_id uuid not null,
  is_primary boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint professional_units_professional_company_fk
    foreign key (company_id, professional_id)
    references public.professionals(company_id, id) on delete cascade,
  constraint professional_units_unit_company_fk
    foreign key (company_id, unit_id)
    references public.company_units(company_id, id) on delete cascade
);

create unique index if not exists professional_units_company_professional_unit_uq
  on public.professional_units(company_id, professional_id, unit_id);
create unique index if not exists professional_units_company_professional_primary_uq
  on public.professional_units(company_id, professional_id)
  where is_primary = true;
create index if not exists professional_units_company_unit_active_idx
  on public.professional_units(company_id, unit_id, active);
create index if not exists professional_units_company_professional_active_idx
  on public.professional_units(company_id, professional_id, active);

insert into public.professional_units (company_id, professional_id, unit_id, is_primary, active)
select p.company_id, p.id, u.id, true, true
from public.professionals p
join public.company_units u
  on u.company_id = p.company_id
 and u.is_default = true
where p.company_id is not null
on conflict (company_id, professional_id, unit_id) do nothing;

alter table public.professional_units enable row level security;

commit;
