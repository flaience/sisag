begin;

create table if not exists public.whatsapp_staff_accesses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  whatsapp_account_id uuid not null references public.whatsapp_accounts(id) on delete cascade,
  phone_e164 varchar(32) not null,
  role varchar(24) not null,
  professional_id uuid references public.professionals(id) on delete restrict,
  active boolean not null default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_staff_accesses_phone_check check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  constraint whatsapp_staff_accesses_role_check check (role in ('manager','professional')),
  constraint whatsapp_staff_accesses_professional_role_check check (
    (role = 'manager' and professional_id is null)
    or (role = 'professional' and professional_id is not null)
  )
);

create unique index if not exists whatsapp_staff_accesses_account_phone_uq
  on public.whatsapp_staff_accesses(whatsapp_account_id, phone_e164);
create index if not exists whatsapp_staff_accesses_company_active_idx
  on public.whatsapp_staff_accesses(company_id, active, phone_e164);
create index if not exists whatsapp_staff_accesses_professional_idx
  on public.whatsapp_staff_accesses(company_id, professional_id);

create table if not exists public.whatsapp_staff_access_audit (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  access_id uuid not null references public.whatsapp_staff_accesses(id) on delete cascade,
  action varchar(24) not null check (action in ('created','updated','deactivated','reactivated')),
  actor_id uuid,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_staff_access_audit_company_access_idx
  on public.whatsapp_staff_access_audit(company_id, access_id, created_at);

create or replace function public.validate_whatsapp_staff_access_scope()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.whatsapp_accounts wa
    where wa.id = new.whatsapp_account_id and wa.company_id = new.company_id
  ) then
    raise exception 'whatsapp_account_company_mismatch';
  end if;

  if new.professional_id is not null and not exists (
    select 1 from public.professionals p
    where p.id = new.professional_id and p.company_id = new.company_id
  ) then
    raise exception 'professional_company_mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists whatsapp_staff_access_scope_guard on public.whatsapp_staff_accesses;
create trigger whatsapp_staff_access_scope_guard
before insert or update of company_id, whatsapp_account_id, professional_id
on public.whatsapp_staff_accesses
for each row execute function public.validate_whatsapp_staff_access_scope();

alter table public.whatsapp_staff_accesses enable row level security;
alter table public.whatsapp_staff_access_audit enable row level security;

commit;
