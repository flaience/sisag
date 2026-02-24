-- Custom SQL migration file, put your code below! ---- garante extensão (não faz nada se já existir)
create extension if not exists btree_gist;

-- sanidade: evita intervalos inválidos
alter table public.booking_item_allocations
  add constraint booking_alloc_valid_time
  check (
    start_time is null
    or end_time is null
    or start_time < end_time
  );

-- overlap: um mesmo resource_id não pode ter interseção de intervalo
alter table public.booking_item_allocations
  add constraint booking_alloc_no_overlap
  exclude using gist (
    resource_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  )
  where (start_time is not null and end_time is not null);