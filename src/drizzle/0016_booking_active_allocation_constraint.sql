ALTER TABLE "booking_item_allocations"
ADD COLUMN "blocks_schedule" boolean DEFAULT true NOT NULL;
--> statement-breakpoint

UPDATE "booking_item_allocations" AS allocation
SET "blocks_schedule" = booking."status" IN ('PENDING', 'CONFIRMED')
FROM "booking_items" AS item
INNER JOIN "bookings" AS booking ON booking."id" = item."booking_id"
WHERE item."id" = allocation."booking_item_id";
--> statement-breakpoint

CREATE OR REPLACE FUNCTION "public"."sync_allocation_blocking_on_write"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  booking_status text;
BEGIN
  SELECT booking."status"::text
  INTO booking_status
  FROM "public"."booking_items" AS item
  INNER JOIN "public"."bookings" AS booking
    ON booking."id" = item."booking_id"
  WHERE item."id" = NEW."booking_item_id";

  IF booking_status IS NULL THEN
    RAISE EXCEPTION 'Booking not found for booking item %', NEW."booking_item_id";
  END IF;

  NEW."blocks_schedule" := booking_status IN ('PENDING', 'CONFIRMED');
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS "booking_allocation_sync_blocking_on_write"
ON "public"."booking_item_allocations";
--> statement-breakpoint

CREATE TRIGGER "booking_allocation_sync_blocking_on_write"
BEFORE INSERT OR UPDATE OF "booking_item_id"
ON "public"."booking_item_allocations"
FOR EACH ROW
EXECUTE FUNCTION "public"."sync_allocation_blocking_on_write"();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION "public"."sync_booking_allocations_blocking_on_status"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE "public"."booking_item_allocations" AS allocation
  SET "blocks_schedule" = NEW."status" IN ('PENDING', 'CONFIRMED')
  FROM "public"."booking_items" AS item
  WHERE item."id" = allocation."booking_item_id"
    AND item."booking_id" = NEW."id";

  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS "booking_sync_allocations_blocking_on_status"
ON "public"."bookings";
--> statement-breakpoint

CREATE TRIGGER "booking_sync_allocations_blocking_on_status"
AFTER UPDATE OF "status"
ON "public"."bookings"
FOR EACH ROW
WHEN (OLD."status" IS DISTINCT FROM NEW."status")
EXECUTE FUNCTION "public"."sync_booking_allocations_blocking_on_status"();
--> statement-breakpoint

ALTER TABLE "public"."booking_item_allocations"
DROP CONSTRAINT IF EXISTS "booking_alloc_no_overlap";
--> statement-breakpoint

ALTER TABLE "public"."booking_item_allocations"
ADD CONSTRAINT "booking_alloc_no_overlap"
EXCLUDE USING gist (
  "resource_id" WITH =,
  tstzrange("start_time", "end_time", '[)') WITH &&
)
WHERE ("blocks_schedule");
