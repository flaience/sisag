-- Custom SQL migration file, put your code below! --CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE booking_item_allocations
DROP CONSTRAINT IF EXISTS booking_allocations_no_overlap;

ALTER TABLE booking_item_allocations
ADD CONSTRAINT booking_allocations_no_overlap
EXCLUDE USING gist (
  resource_id WITH =,
  tstzrange(start_time, end_time, '[)') WITH &&
);