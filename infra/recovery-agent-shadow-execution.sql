BEGIN;
ALTER TABLE booking_recovery_recommendations
  ADD COLUMN IF NOT EXISTS agent_decision jsonb,
  ADD COLUMN IF NOT EXISTS agent_execution jsonb;
COMMIT;

-- Reversão, se necessária:
-- ALTER TABLE booking_recovery_recommendations DROP COLUMN IF EXISTS agent_execution, DROP COLUMN IF EXISTS agent_decision;
