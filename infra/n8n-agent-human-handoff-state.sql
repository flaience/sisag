CREATE TABLE IF NOT EXISTS n8n_agent_human_handoff_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  whatsapp_account_id uuid NOT NULL,
  sender_key varchar(64) NOT NULL,
  correlation_id varchar(240) NOT NULL,
  reason_code varchar(64) NOT NULL,
  confidence_milli integer NULL,
  status varchar(24) NOT NULL DEFAULT 'pending',
  claimed_by uuid NULL,
  claimed_at timestamptz NULL,
  resolved_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT n8n_agent_handoff_status_check CHECK (status IN ('pending','claimed','resolved','dismissed','superseded')),
  CONSTRAINT n8n_agent_handoff_confidence_check CHECK (confidence_milli IS NULL OR confidence_milli BETWEEN 0 AND 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS n8n_agent_handoff_company_correlation_uq ON n8n_agent_human_handoff_states(company_id, correlation_id);
CREATE INDEX IF NOT EXISTS n8n_agent_handoff_identity_idx ON n8n_agent_human_handoff_states(company_id, whatsapp_account_id, sender_key, created_at DESC);
ALTER TABLE n8n_agent_human_handoff_states ENABLE ROW LEVEL SECURITY;