-- 1) extensão necessária para EXCLUDE USING gist com igualdade em UUID
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2) adiciona a coluna end_time (primeiro sem NOT NULL para permitir backfill)
ALTER TABLE appointments
ADD COLUMN end_time timestamp with time zone;

-- 3) preenche registros existentes com base em scheduled_time + duration_minutes
UPDATE appointments
SET end_time = scheduled_time + (duration_minutes * INTERVAL '1 minute')
WHERE end_time IS NULL;

-- 4) torna obrigatória a coluna
ALTER TABLE appointments
ALTER COLUMN end_time SET NOT NULL;

-- 5) cria a constraint para impedir sobreposição de horários ativos
ALTER TABLE appointments
ADD CONSTRAINT appointments_no_overlap_active
EXCLUDE USING gist (
  professional_id WITH =,
  tstzrange(scheduled_time, end_time, '[)') WITH &&
)
WHERE (status IN ('PENDING', 'CONFIRMED'));