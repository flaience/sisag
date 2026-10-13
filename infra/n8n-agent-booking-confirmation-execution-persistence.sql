ALTER TABLE n8n_agent_booking_confirmation_states
  ADD COLUMN IF NOT EXISTS execution_started_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS execution_completed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS booking_id uuid NULL,
  ADD COLUMN IF NOT EXISTS execution_error_code varchar(64) NULL;

ALTER TABLE n8n_agent_booking_confirmation_states DROP CONSTRAINT IF EXISTS n8n_agent_booking_confirmation_status_check;
ALTER TABLE n8n_agent_booking_confirmation_states ADD CONSTRAINT n8n_agent_booking_confirmation_status_check CHECK (status IN ('awaiting_confirmation','confirmed_pending_execution','execution_in_progress','completed','failed_slot_taken','execution_uncertain','rejected','superseded','expired'));
CREATE INDEX IF NOT EXISTS n8n_agent_booking_confirmation_execution_idx ON n8n_agent_booking_confirmation_states(company_id, status, updated_at);
