-- 0001_refina_modelo_supabase.sql
-- OBJETIVO: Ajustes seguros (sem renomear colunas/tabelas), focando em:
-- - timestamps consistentes (updated_at)
-- - status em lowercase
-- - índices/constraints essenciais
-- - phone em padrão WhatsApp (E.164) sem quebrar compatibilidade
-- Compatível com Supabase (Postgres)

begin;

-- =========================
-- EXTENSÕES (se ainda não tiver)
-- =========================
create extension if not exists pgcrypto;

-- =========================
-- FUNÇÃO/TRIGGER updated_at
-- =========================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================
-- TENANTS
-- =========================
alter table if exists public.tenants
  add column if not exists updated_at timestamptz default now();

drop trigger if exists trg_tenants_updated_at on public.tenants;
create trigger trg_tenants_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

create index if not exists tenants_cnpj_idx on public.tenants(cnpj);

-- =========================
-- COMPANIES
-- =========================
alter table if exists public.companies
  add column if not exists updated_at timestamptz default now();

drop trigger if exists trg_companies_updated_at on public.companies;
create trigger trg_companies_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

create index if not exists companies_tenant_id_idx on public.companies(tenant_id);

-- =========================
-- PROFESSIONALS
-- =========================
alter table if exists public.professionals
  add column if not exists updated_at timestamptz default now();

drop trigger if exists trg_professionals_updated_at on public.professionals;
create trigger trg_professionals_updated_at
before update on public.professionals
for each row execute function public.set_updated_at();

create index if not exists professionals_company_id_idx on public.professionals(company_id);

-- status lowercase (sem quebrar: só ajusta default + constraint)
alter table if exists public.professionals
  alter column status set default 'active';

alter table if exists public.professionals
  drop constraint if exists professionals_status_lowercase_chk;

alter table if exists public.professionals
  add constraint professionals_status_lowercase_chk check (status = lower(status));

-- =========================
-- CLIENTS
-- =========================
alter table if exists public.clients
  add column if not exists updated_at timestamptz default now();

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create index if not exists clients_company_id_idx on public.clients(company_id);

-- Adiciona phone_e164 sem remover o phone atual (compatível)
alter table if exists public.clients
  add column if not exists phone_e164 text;

-- Se já existir phone e phone_e164 estiver vazio, copia
update public.clients
set phone_e164 = phone
where phone_e164 is null and phone is not null;

-- Constraint simples: começar com + e ter de 10 a 16 dígitos (bem permissivo)
alter table if exists public.clients
  drop constraint if exists clients_phone_e164_chk;

alter table if exists public.clients
  add constraint clients_phone_e164_chk
  check (phone_e164 is null or phone_e164 ~ '^\+[1-9]\d{9,15}$');

-- =========================
-- APPOINTMENTS
-- =========================
alter table if exists public.appointments
  add column if not exists updated_at timestamptz default now();

drop trigger if exists trg_appointments_updated_at on public.appointments;
create trigger trg_appointments_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

create index if not exists appointments_company_id_idx on public.appointments(company_id);
create index if not exists appointments_professional_time_idx on public.appointments(professional_id, scheduled_time);

-- status lowercase e default coerente
alter table if exists public.appointments
  alter column status set default 'pending';

alter table if exists public.appointments
  drop constraint if exists appointments_status_lowercase_chk;

alter table if exists public.appointments
  add constraint appointments_status_lowercase_chk check (status = lower(status));

-- =========================
-- SCHEDULING_CONFIG
-- =========================
alter table if exists public.scheduling_config
  add column if not exists updated_at timestamptz default now();

drop trigger if exists trg_scheduling_config_updated_at on public.scheduling_config;
create trigger trg_scheduling_config_updated_at
before update on public.scheduling_config
for each row execute function public.set_updated_at();

create index if not exists scheduling_config_company_id_idx on public.scheduling_config(company_id);

-- Se você quer 1 config por company:
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='scheduling_config_company_unique'
  ) then
    execute 'create unique index scheduling_config_company_unique on public.scheduling_config(company_id)';
  end if;
end $$;

-- =========================
-- PROFESSIONAL_SCHEDULES
-- =========================
alter table if exists public.professional_schedules
  add column if not exists updated_at timestamptz default now();

drop trigger if exists trg_professional_schedules_updated_at on public.professional_schedules;
create trigger trg_professional_schedules_updated_at
before update on public.professional_schedules
for each row execute function public.set_updated_at();

create index if not exists professional_schedules_prof_weekday_idx
  on public.professional_schedules(professional_id, weekday);

-- weekday válido
alter table if exists public.professional_schedules
  drop constraint if exists professional_schedules_weekday_chk;

alter table if exists public.professional_schedules
  add constraint professional_schedules_weekday_chk check (weekday between 0 and 6);

-- =========================
-- OUTBOX
-- =========================
-- Garante default e constraint em lowercase (você já tem algo parecido)
alter table if exists public.outbox
  alter column status set default 'pending';

alter table if exists public.outbox
  drop constraint if exists outbox_status_lowercase_chk;

alter table if exists public.outbox
  add constraint outbox_status_lowercase_chk check (status = lower(status));

create index if not exists outbox_dispatch_idx
  on public.outbox(status, next_retry_at, created_at);

-- =========================
-- Z-API TABLES
-- =========================
alter table if exists public.zapi_accounts
  add column if not exists updated_at timestamptz default now();

drop trigger if exists trg_zapi_accounts_updated_at on public.zapi_accounts;
create trigger trg_zapi_accounts_updated_at
before update on public.zapi_accounts
for each row execute function public.set_updated_at();

create index if not exists zapi_accounts_tenant_id_idx on public.zapi_accounts(tenant_id);

-- status lowercase
alter table if exists public.zapi_accounts
  alter column status set default 'active';

alter table if exists public.zapi_accounts
  drop constraint if exists zapi_accounts_status_lowercase_chk;

alter table if exists public.zapi_accounts
  add constraint zapi_accounts_status_lowercase_chk check (status = lower(status));

-- zapi_numbers
alter table if exists public.zapi_numbers
  add column if not exists updated_at timestamptz default now();

drop trigger if exists trg_zapi_numbers_updated_at on public.zapi_numbers;
create trigger trg_zapi_numbers_updated_at
before update on public.zapi_numbers
for each row execute function public.set_updated_at();

create index if not exists zapi_numbers_account_id_idx on public.zapi_numbers(account_id);

-- zapi_messages
alter table if exists public.zapi_messages
  add column if not exists updated_at timestamptz default now();

drop trigger if exists trg_zapi_messages_updated_at on public.zapi_messages;
create trigger trg_zapi_messages_updated_at
before update on public.zapi_messages
for each row execute function public.set_updated_at();

create index if not exists zapi_messages_account_id_idx on public.zapi_messages(account_id);
create index if not exists zapi_messages_to_idx on public.zapi_messages ("to");

commit;
    