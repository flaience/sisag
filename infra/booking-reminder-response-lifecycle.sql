begin;
alter type public.booking_event_type add value if not exists 'automation.booking_reminder.responded';
commit;
