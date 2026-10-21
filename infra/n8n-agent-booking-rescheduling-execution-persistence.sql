ALTER TABLE n8n_agent_booking_rescheduling_states
  ADD COLUMN IF NOT EXISTS execution_started_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS execution_completed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS execution_error_code varchar(64) NULL;
ALTER TABLE n8n_agent_booking_rescheduling_states DROP CONSTRAINT IF EXISTS n8n_agent_booking_rescheduling_status_check;
ALTER TABLE n8n_agent_booking_rescheduling_states ADD CONSTRAINT n8n_agent_booking_rescheduling_status_check CHECK (status IN ('awaiting_confirmation','rescheduling_pending','execution_in_progress','completed','failed_slot_unavailable','failed_not_reschedulable','execution_uncertain','rejected','superseded','expired'));
CREATE INDEX IF NOT EXISTS n8n_agent_booking_rescheduling_execution_idx ON n8n_agent_booking_rescheduling_states(company_id, status, updated_at);
