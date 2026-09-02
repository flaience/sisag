begin;
alter type booking_event_type add value if not exists 'automation.booking_recovery.draft_approved';
alter type booking_event_type add value if not exists 'automation.booking_recovery.contact_queued';
alter table public.booking_recovery_drafts add column if not exists approved_by uuid;
alter table public.booking_recovery_drafts add column if not exists approved_at timestamptz;
alter table public.booking_recovery_drafts add column if not exists outbox_id uuid references public.outbox(id) on delete set null;
alter table public.booking_recovery_drafts add column if not exists sent_at timestamptz;
commit;
