CREATE TABLE IF NOT EXISTS n8n_agent_booking_cancellation_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE, whatsapp_account_id uuid NOT NULL, sender_key varchar(64) NOT NULL, correlation_id varchar(240) NOT NULL, request_id varchar(500) NOT NULL, appointment_id uuid NOT NULL, appointment_status varchar(16) NOT NULL, starts_at timestamptz NOT NULL, status varchar(32) NOT NULL DEFAULT 'awaiting_confirmation', expires_at timestamptz NOT NULL, decided_at timestamptz NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT n8n_agent_booking_cancellation_status_check CHECK (status IN ('awaiting_confirmation','cancellation_pending','rejected','superseded','expired')),
  CONSTRAINT n8n_agent_booking_cancellation_appointment_status_check CHECK (appointment_status IN ('PENDING','CONFIRMED')),
  CONSTRAINT n8n_agent_booking_cancellation_window_check CHECK (starts_at > created_at AND expires_at > created_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS n8n_agent_booking_cancellation_request_uq ON n8n_agent_booking_cancellation_states(company_id, request_id);
CREATE INDEX IF NOT EXISTS n8n_agent_booking_cancellation_identity_idx ON n8n_agent_booking_cancellation_states(company_id, whatsapp_account_id, sender_key, created_at DESC);
CREATE INDEX IF NOT EXISTS n8n_agent_booking_cancellation_appointment_idx ON n8n_agent_booking_cancellation_states(company_id, appointment_id);
ALTER TABLE n8n_agent_booking_cancellation_states ENABLE ROW LEVEL SECURITY;
