ALTER TABLE commercial_post_activation_due_work_items
  ADD COLUMN IF NOT EXISTS deferred_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_deferred_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_deferred_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_deferral_reason varchar(40),
  ADD COLUMN IF NOT EXISTS escalation_required boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'commercial_post_activation_due_items_deferral_count_check'
  ) THEN
    ALTER TABLE commercial_post_activation_due_work_items
      ADD CONSTRAINT commercial_post_activation_due_items_deferral_count_check
      CHECK (deferred_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'commercial_post_activation_due_items_deferral_history_check'
  ) THEN
    ALTER TABLE commercial_post_activation_due_work_items
      ADD CONSTRAINT commercial_post_activation_due_items_deferral_history_check
      CHECK (
        (
          deferred_count = 0
          AND first_deferred_at IS NULL
          AND last_deferred_at IS NULL
          AND last_deferral_reason IS NULL
          AND escalation_required = false
        )
        OR
        (
          deferred_count > 0
          AND first_deferred_at IS NOT NULL
          AND last_deferred_at IS NOT NULL
          AND last_deferred_at >= first_deferred_at
          AND last_deferral_reason IN (
            'business_wait',
            'deferral_limit_reached',
            'wait_deadline_reached'
          )
          AND (
            (escalation_required = false AND last_deferral_reason = 'business_wait')
            OR
            (escalation_required = true AND last_deferral_reason IN (
              'deferral_limit_reached',
              'wait_deadline_reached'
            ))
          )
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS commercial_pa_due_items_escalated_idx
  ON commercial_post_activation_due_work_items (first_deferred_at, id)
  WHERE escalation_required = true AND status <> 'completed';

COMMENT ON COLUMN commercial_post_activation_due_work_items.deferred_count IS
  'Quantidade de adiamentos de negócio acumulados pelo trabalho.';

COMMENT ON COLUMN commercial_post_activation_due_work_items.first_deferred_at IS
  'Início durável da janela de espera de negócio.';

COMMENT ON COLUMN commercial_post_activation_due_work_items.last_deferral_reason IS
  'Motivo estruturado do adiamento ou escalonamento mais recente.';

COMMENT ON COLUMN commercial_post_activation_due_work_items.escalation_required IS
  'Indica trabalho que excedeu a política de espera e exige ação operacional.';
