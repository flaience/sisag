alter type public.automation_job_type add value if not exists 'booking_reminder';
alter type public.automation_job_status add value if not exists 'processing';

alter table public.automation_jobs
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists outbox_id uuid references public.outbox(id) on delete set null,
  add column if not exists locked_at timestamptz,
  add column if not exists completed_at timestamptz;

create index if not exists automation_jobs_company_booking_idx
  on public.automation_jobs (company_id, booking_id, status);

alter table public.automation_jobs enable row level security;
