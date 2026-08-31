begin;
alter table public.bookings add column if not exists source varchar(16) not null default 'api', add column if not exists requested_by uuid, add column if not exists request_id varchar(100);
do $$ begin if not exists (select 1 from pg_constraint where conname = 'bookings_source_check') then alter table public.bookings add constraint bookings_source_check check (source in ('panel', 'whatsapp', 'agent', 'api')); end if; end $$;
create index if not exists bookings_company_request_idx on public.bookings (company_id, request_id) where request_id is not null;
commit;
