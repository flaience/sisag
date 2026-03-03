-- Custom SQL migration file, put your code below! ---- preenche qualquer allocation antiga que esteja faltando times
UPDATE booking_item_allocations a
SET
  start_time = COALESCE(a.start_time, bi.start_time),
  end_time   = COALESCE(a.end_time,   bi.end_time)
FROM booking_items bi
WHERE bi.id = a.booking_item_id
  AND (a.start_time IS NULL OR a.end_time IS NULL);

-- se ainda existir null (dados ruins), falhe aqui para você corrigir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM booking_item_allocations
    WHERE start_time IS NULL OR end_time IS NULL
  ) THEN
    RAISE EXCEPTION 'Ainda existem allocations com start_time/end_time NULL';
  END IF;
END $$;

ALTER TABLE booking_item_allocations
ALTER COLUMN start_time SET NOT NULL;

ALTER TABLE booking_item_allocations
ALTER COLUMN end_time SET NOT NULL;