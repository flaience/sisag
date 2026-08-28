begin;

alter table public.companies
  add column if not exists trade_name varchar(160),
  add column if not exists logo_path varchar(500);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'companies_trade_name_check') then
    alter table public.companies add constraint companies_trade_name_check
      check (trade_name is null or length(trim(trade_name)) >= 2);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'companies_logo_path_check') then
    alter table public.companies add constraint companies_logo_path_check
      check (logo_path is null or (
        logo_path !~ '^/' and position('..' in logo_path) = 0 and
        logo_path ~ '^[a-zA-Z0-9][a-zA-Z0-9/_.-]*$'
      ));
  end if;
end $$;

commit;
