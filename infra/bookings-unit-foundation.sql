begin;

alter table public.bookings add column if not exists unit_id uuid;

-- Prioridade 1: o local principal ativo do profissional já alocado.
with resolved as (
  select distinct on (b.id)
    b.id as booking_id,
    pu.unit_id
  from public.bookings b
  join public.booking_items bi on bi.booking_id = b.id
  join public.booking_item_allocations bia on bia.booking_item_id = bi.id
  join public.professionals p
    on p.company_id = b.company_id
   and p.resource_id = bia.resource_id
  join public.professional_units pu
    on pu.company_id = b.company_id
   and pu.professional_id = p.id
   and pu.active = true
  join public.company_units cu
    on cu.company_id = b.company_id
   and cu.id = pu.unit_id
   and cu.active = true
  where b.unit_id is null
  order by b.id, pu.is_primary desc, pu.created_at asc
)
update public.bookings b
set unit_id = resolved.unit_id
from resolved
where b.id = resolved.booking_id;

-- Prioridade 2: local padrão ativo da empresa; em último caso, o primeiro ativo.
with resolved as (
  select distinct on (cu.company_id)
    cu.company_id,
    cu.id as unit_id
  from public.company_units cu
  where cu.active = true
  order by cu.company_id, cu.is_default desc, cu.created_at asc
)
update public.bookings b
set unit_id = resolved.unit_id
from resolved
where b.unit_id is null
  and resolved.company_id = b.company_id;

do $$
begin
  if exists (select 1 from public.bookings where unit_id is null) then
    raise exception 'Existem bookings sem local resolvível; migração interrompida.';
  end if;
end $$;

alter table public.bookings alter column unit_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_unit_company_fk'
  ) then
    alter table public.bookings
      add constraint bookings_unit_company_fk
      foreign key (company_id, unit_id)
      references public.company_units(company_id, id)
      on delete restrict;
  end if;
end $$;

create index if not exists bookings_company_unit_time_idx
  on public.bookings(company_id, unit_id, start_time);

commit;
