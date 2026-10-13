CREATE TABLE IF NOT EXISTS n8n_agent_booking_confirmation_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE, whatsapp_account_id uuid NOT NULL, sender_key varchar(64) NOT NULL, correlation_id varchar(240) NOT NULL, request_id varchar(500) NOT NULL, service_id uuid NOT NULL, professional_id uuid NULL, unit_id uuid NULL, starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, status varchar(32) NOT NULL DEFAULT 'awaiting_confirmation', expires_at timestamptz NOT NULL, decided_at timestamptz NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT n8n_agent_booking_confirmation_status_check CHECK (status IN ('awaiting_confirmation','confirmed_pending_execution','rejected','superseded','expired')),
  CONSTRAINT n8n_agent_booking_confirmation_window_check CHECK (ends_at > starts_at AND expires_at > created_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS n8n_agent_booking_confirmation_request_uq ON n8n_agent_booking_confirmation_states(company_id, request_id);
CREATE INDEX IF NOT EXISTS n8n_agent_booking_confirmation_identity_idx ON n8n_agent_booking_confirmation_states(company_id, whatsapp_account_id, sender_key, created_at DESC);
ALTER TABLE n8n_agent_booking_confirmation_states ENABLE ROW LEVEL SECURITY;
