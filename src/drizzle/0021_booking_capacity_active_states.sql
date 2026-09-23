-- Forward migration. Execute transactionally only after rollout review.
-- Never repair conflicting bookings automatically: the exclusion constraint
-- must reject the backfill and roll back the entire migration.
LOCK TABLE "public"."bookings", "public"."booking_items",
  "public"."booking_item_allocations" IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = '"public"."booking_item_allocations"'::regclass
      AND conname = 'booking_alloc_no_overlap' AND contype = 'x'
      AND convalidated
      AND pg_get_constraintdef(oid) LIKE '%blocks_schedule%'
  ) THEN
    RAISE EXCEPTION 'Required active allocation exclusion constraint is absent';
  END IF;
  IF (SELECT count(*) FROM pg_trigger
      WHERE (tgrelid = '"public"."booking_item_allocations"'::regclass
             AND tgname = 'booking_allocation_sync_blocking_on_write'
          OR tgrelid = '"public"."bookings"'::regclass
             AND tgname = 'booking_sync_allocations_blocking_on_status')
        AND tgenabled IN ('O', 'A') AND NOT tgisinternal) <> 2 THEN
    RAISE EXCEPTION 'Required allocation synchronization triggers are absent';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."sync_allocation_blocking_on_write"()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE booking_status text;
BEGIN
  SELECT booking."status"::text INTO booking_status
  FROM "public"."booking_items" AS item
  INNER JOIN "public"."bookings" AS booking ON booking."id" = item."booking_id"
  WHERE item."id" = NEW."booking_item_id";
  IF booking_status IS NULL THEN
    RAISE EXCEPTION 'Booking not found for allocation';
  END IF;
  NEW."blocks_schedule" := booking_status IN ('PENDING', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."sync_booking_allocations_blocking_on_status"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "public"."booking_item_allocations" AS allocation
  SET "blocks_schedule" = NEW."status" IN ('PENDING', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS')
  FROM "public"."booking_items" AS item
  WHERE item."id" = allocation."booking_item_id" AND item."booking_id" = NEW."id";
  RETURN NEW;
END;
$$;

UPDATE "public"."booking_item_allocations" AS allocation
SET "blocks_schedule" = booking."status" IN ('PENDING', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS')
FROM "public"."booking_items" AS item
INNER JOIN "public"."bookings" AS booking ON booking."id" = item."booking_id"
WHERE item."id" = allocation."booking_item_id"
  AND allocation."blocks_schedule" IS DISTINCT FROM
    (booking."status" IN ('PENDING', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS'));
