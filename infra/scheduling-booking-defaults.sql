begin;

alter table public.scheduling_config
  add column if not exists default_unit_id uuid,
  add column if not exists default_service_id uuid,
  add column if not exists default_professional_id uuid;

create index if not exists scheduling_config_default_unit_idx on public.scheduling_config (company_id, default_unit_id) where default_unit_id is not null;
create index if not exists scheduling_config_default_service_idx on public.scheduling_config (company_id, default_service_id) where default_service_id is not null;
create index if not exists scheduling_config_default_professional_idx on public.scheduling_config (company_id, default_professional_id) where default_professional_id is not null;

create or replace function public.validate_scheduling_booking_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.default_unit_id is not null and not exists (
    select 1 from public.company_units u where u.company_id = new.company_id and u.id = new.default_unit_id and u.active
  ) then raise exception 'invalid_default_unit'; end if;

  if new.default_service_id is not null and not exists (
    select 1 from public.services s where s.company_id = new.company_id and s.id = new.default_service_id and s.active
  ) then raise exception 'invalid_default_service'; end if;

  if new.default_professional_id is not null and not exists (
    select 1 from public.professionals p where p.company_id = new.company_id and p.id = new.default_professional_id and lower(p.status) = 'active'
  ) then raise exception 'invalid_default_professional'; end if;

  if new.default_unit_id is not null and new.default_professional_id is not null and not exists (
    select 1 from public.professional_units pu where pu.company_id = new.company_id and pu.unit_id = new.default_unit_id and pu.professional_id = new.default_professional_id and pu.active
  ) then raise exception 'default_professional_not_available_at_unit'; end if;

  if new.default_service_id is not null and new.default_professional_id is not null and not exists (
    select 1 from public.professional_services ps where ps.company_id = new.company_id and ps.service_id = new.default_service_id and ps.professional_id = new.default_professional_id and ps.active
  ) then raise exception 'default_professional_does_not_perform_service'; end if;
  return new;
end;
$$;

drop trigger if exists scheduling_config_validate_defaults on public.scheduling_config;
create trigger scheduling_config_validate_defaults before insert or update of company_id, default_unit_id, default_service_id, default_professional_id on public.scheduling_config for each row execute function public.validate_scheduling_booking_defaults();

commit;
