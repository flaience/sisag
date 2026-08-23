CREATE TABLE IF NOT EXISTS commercial_post_activation_due_work_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id uuid NOT NULL
    REFERENCES commercial_onboardings(id) ON DELETE CASCADE,
  milestone_code varchar(100) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'scheduled',
  due_at timestamptz NOT NULL,
  available_at timestamptz NOT NULL DEFAULT now(),
  priority integer NOT NULL DEFAULT 100,
  attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  locked_by varchar(200),
  last_error text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commercial_post_activation_due_items_status_check
    CHECK (status IN ('scheduled', 'processing', 'completed', 'failed')),
  CONSTRAINT commercial_post_activation_due_items_milestone_code_check
    CHECK (milestone_code ~ '^[a-z0-9][a-z0-9_]*$'),
  CONSTRAINT commercial_post_activation_due_items_priority_check
    CHECK (priority BETWEEN 0 AND 1000),
  CONSTRAINT commercial_post_activation_due_items_attempts_check
    CHECK (attempts >= 0),
  CONSTRAINT commercial_post_activation_due_items_lock_check
    CHECK (
      (status = 'processing' AND locked_until IS NOT NULL
        AND locked_by IS NOT NULL AND length(trim(locked_by)) > 0)
      OR
      (status <> 'processing' AND locked_until IS NULL AND locked_by IS NULL)
    ),
  CONSTRAINT commercial_post_activation_due_items_completion_check
    CHECK ((status = 'completed') = (completed_at IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS commercial_pa_due_items_onboarding_milestone_uq
  ON commercial_post_activation_due_work_items (onboarding_id, milestone_code);

CREATE INDEX IF NOT EXISTS commercial_pa_due_items_claimable_idx
  ON commercial_post_activation_due_work_items
    (available_at, due_at, priority, id)
  WHERE status IN ('scheduled', 'failed');

CREATE INDEX IF NOT EXISTS commercial_pa_due_items_processing_expiry_idx
  ON commercial_post_activation_due_work_items (locked_until, id)
  WHERE status = 'processing';

ALTER TABLE commercial_post_activation_due_work_items ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE commercial_post_activation_due_work_items IS
  'Fila durável e indexada dos marcos pós-ativação agendados para processamento.';

COMMENT ON COLUMN commercial_post_activation_due_work_items.available_at IS
  'Instante a partir do qual o item pode ser reivindicado ou reprocessado.';

COMMENT ON COLUMN commercial_post_activation_due_work_items.locked_until IS
  'Validade da reserva temporária feita por um worker.';
