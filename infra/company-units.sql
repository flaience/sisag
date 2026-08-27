begin;

create table if not exists public.company_units (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code varchar(40) not null,
  name varchar(160) not null,
  time_zone varchar(80) not null default 'America/Sao_Paulo',
  phone varchar(32), email varchar(320), postal_code varchar(20),
  street varchar(200), number varchar(30), complement varchar(120),
  district varchar(120), city varchar(120), state varchar(80),
  country_code varchar(2) not null default 'BR',
  is_default boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_units_code_check check (code ~ '^[a-z0-9][a-z0-9_-]*$'),
  constraint company_units_name_check check (length(trim(name)) >= 2),
  constraint company_units_time_zone_check check (length(trim(time_zone)) > 0),
  constraint company_units_country_code_check check (country_code ~ '^[A-Z]{2}$')
);
create unique index if not exists company_units_company_code_uq on public.company_units(company_id, code);
create unique index if not exists company_units_company_default_uq on public.company_units(company_id) where is_default = true;
create index if not exists company_units_company_active_idx on public.company_units(company_id, active, name);
alter table public.company_units enable row level security;

commit;
