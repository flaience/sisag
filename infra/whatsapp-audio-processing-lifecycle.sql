BEGIN;
CREATE TABLE IF NOT EXISTS whatsapp_audio_processing(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  whatsapp_account_id uuid REFERENCES whatsapp_accounts(id) ON DELETE SET NULL,
  provider_message_id text NOT NULL,
  media_id text NOT NULL,
  mime_type varchar(100),
  status varchar(16) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
  lease_token uuid,
  lease_expires_at timestamptz,
  transcript text CHECK(transcript IS NULL OR char_length(transcript) BETWEEN 1 AND 20000),
  confidence integer CHECK(confidence IS NULL OR confidence BETWEEN 0 AND 1000),
  policy_version varchar(100),
  error_code varchar(64),
  completed_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_audio_processing_company_message_uq ON whatsapp_audio_processing(company_id,provider_message_id);
CREATE INDEX IF NOT EXISTS whatsapp_audio_processing_company_status_idx ON whatsapp_audio_processing(company_id,status,created_at);
ALTER TABLE whatsapp_audio_processing ENABLE ROW LEVEL SECURITY;
COMMIT;
