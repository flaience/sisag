alter table public.scheduling_config
  add column if not exists min_booking_advance_minutes integer not null default 60;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'scheduling_config_min_booking_advance_check') then
    alter table public.scheduling_config add constraint scheduling_config_min_booking_advance_check check (min_booking_advance_minutes between 0 and 43200);
  end if;
end $$;
