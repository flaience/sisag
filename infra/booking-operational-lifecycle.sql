alter table public.bookings
  add column if not exists arrived_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists no_show_at timestamptz;

alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('PENDING','CONFIRMED','ARRIVED','IN_PROGRESS','CANCELLED','COMPLETED','NO_SHOW','RESCHEDULED'));

alter type public.booking_status add value if not exists 'ARRIVED';
alter type public.booking_status add value if not exists 'IN_PROGRESS';
alter type public.booking_status add value if not exists 'NO_SHOW';
alter type public.booking_event_type add value if not exists 'booking.arrived';
alter type public.booking_event_type add value if not exists 'booking.started';
alter type public.booking_event_type add value if not exists 'booking.no_show';
