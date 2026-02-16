ALTER TABLE "outbox"
  DROP CONSTRAINT IF EXISTS "outbox_status_chk";

ALTER TABLE "outbox"
  ADD CONSTRAINT "outbox_status_chk"
  CHECK ("status" IN ('pending','processing','done','failed'));