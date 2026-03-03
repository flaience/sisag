ALTER TABLE booking_item_allocations
ADD CONSTRAINT booking_alloc_no_overlap
EXCLUDE USING gist (
  resource_id WITH =,
  tstzrange(start_time, end_time, '[)') WITH &&
)
WHERE (start_time IS NOT NULL AND end_time IS NOT NULL);