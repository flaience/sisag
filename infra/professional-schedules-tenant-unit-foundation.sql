begin;

alter table public.professional_schedules
  add column if not exists company_id uuid,
  add column if not exists unit_id uuid;

update public.professional_schedules ps
set company_id = p.company_id
from public.professionals p
where p.id = ps.professional_id
  and ps.company_id is null;

update public.professional_schedules ps
set unit_id = (
  select pu.unit_id
  from public.professional_units pu
  where pu.company_id = ps.company_id
    and pu.professional_id = ps.professional_id
    and pu.active = true
  order by pu.is_primary desc, pu.created_at, pu.id
  limit 1
)
where ps.unit_id is null;

update public.professional_schedules
set created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, created_at, now())
where created_at is null or updated_at is null;

do $$
begin
  if exists (
    select 1 from public.professional_schedules
    where company_id is null or professional_id is null or unit_id is null
  ) then
    raise exception 'professional_schedules_without_company_professional_or_unit';
  end if;
end $$;

alter table public.professional_schedules
  alter column company_id set not null,
  alter column professional_id set not null,
  alter column unit_id set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

alter table public.professional_schedules
  drop constraint if exists professional_schedules_professional_id_professionals_id_fk,
  drop constraint if exists professional_schedules_company_id_fkey,
  drop constraint if exists professional_schedules_professional_company_fk,
  drop constraint if exists professional_schedules_professional_unit_fk,
  drop constraint if exists professional_schedules_weekday_check,
  drop constraint if exists professional_schedules_time_format_check,
  drop constraint if exists professional_schedules_time_order_check;

alter table public.professional_schedules
  add constraint professional_schedules_company_id_fkey
    foreign key (company_id) references public.companies(id) on delete cascade,
  add constraint professional_schedules_professional_company_fk
    foreign key (company_id, professional_id)
    references public.professionals(company_id, id) on delete cascade,
  add constraint professional_schedules_professional_unit_fk
    foreign key (company_id, professional_id, unit_id)
    references public.professional_units(company_id, professional_id, unit_id) on delete cascade,
  add constraint professional_schedules_weekday_check check (weekday between 0 and 6),
  add constraint professional_schedules_time_format_check
    check (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  add constraint professional_schedules_time_order_check check (start_time < end_time);

create unique index if not exists professional_schedules_company_unit_professional_period_uq
  on public.professional_schedules (company_id, unit_id, professional_id, weekday, start_time, end_time);
create index if not exists professional_schedules_company_professional_weekday_idx
  on public.professional_schedules (company_id, professional_id, weekday, start_time);
create index if not exists professional_schedules_company_unit_weekday_idx
  on public.professional_schedules (company_id, unit_id, weekday, start_time);

alter table public.professional_schedules enable row level security;

commit;
