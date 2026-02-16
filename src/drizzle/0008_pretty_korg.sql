ALTER TABLE "outbox"
  DROP CONSTRAINT IF EXISTS "outbox_event_type_allowed";

ALTER TABLE "outbox"
  ADD CONSTRAINT "outbox_event_type_allowed"
  CHECK (
    "outbox"."event_type" ~ '^[a-z0-9_]+(\.[a-z0-9_]+)+$'
  );