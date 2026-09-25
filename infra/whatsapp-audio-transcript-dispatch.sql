BEGIN;

ALTER TABLE public.whatsapp_audio_processing
  ADD COLUMN IF NOT EXISTS dispatch_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dispatch_lease_token uuid,
  ADD COLUMN IF NOT EXISTS dispatch_lease_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispatch_error_code varchar(64),
  ADD COLUMN IF NOT EXISTS dispatched_at timestamptz;

ALTER TABLE public.whatsapp_audio_processing
  DROP CONSTRAINT IF EXISTS whatsapp_audio_processing_dispatch_attempts_check;
ALTER TABLE public.whatsapp_audio_processing
  ADD CONSTRAINT whatsapp_audio_processing_dispatch_attempts_check
  CHECK (dispatch_attempts BETWEEN 0 AND 3);

CREATE INDEX IF NOT EXISTS whatsapp_audio_processing_dispatch_idx
  ON public.whatsapp_audio_processing (status, dispatched_at, created_at)
  WHERE status = 'completed' AND dispatched_at IS NULL;

COMMIT;
