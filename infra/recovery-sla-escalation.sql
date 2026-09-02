ALTER TYPE booking_event_type ADD VALUE IF NOT EXISTS 'automation.booking_recovery.sla_escalated';
ALTER TABLE booking_recovery_responses ADD COLUMN IF NOT EXISTS sla_escalated_at timestamptz;
CREATE INDEX IF NOT EXISTS booking_recovery_responses_pending_sla_idx ON booking_recovery_responses (company_id, acknowledged_at, sla_escalated_at, created_at);
