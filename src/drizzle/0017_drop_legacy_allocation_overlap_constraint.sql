DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_record
    INNER JOIN pg_class AS table_record
      ON table_record.oid = constraint_record.conrelid
    INNER JOIN pg_namespace AS schema_record
      ON schema_record.oid = table_record.relnamespace
    WHERE schema_record.nspname = 'public'
      AND table_record.relname = 'booking_item_allocations'
      AND constraint_record.conname = 'booking_alloc_no_overlap'
      AND constraint_record.contype = 'x'
      AND pg_get_constraintdef(constraint_record.oid) LIKE '%blocks_schedule%'
  ) THEN
    RAISE EXCEPTION
      'Active allocation overlap constraint is missing or invalid';
  END IF;

  ALTER TABLE "public"."booking_item_allocations"
  DROP CONSTRAINT IF EXISTS "booking_allocations_no_overlap";
END;
$$;
