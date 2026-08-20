CREATE TABLE IF NOT EXISTS commercial_post_activation_alert_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_key varchar(500) NOT NULL,
  onboarding_id uuid NOT NULL REFERENCES commercial_onboardings(id) ON DELETE CASCADE,
  commercial_client_id uuid NOT NULL REFERENCES commercial_clients(id) ON DELETE CASCADE,
  severity varchar(20) NOT NULL,
  category varchar(40) NOT NULL,
  opened_at timestamptz NOT NULL,
  last_observed_at timestamptz NOT NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commercial_post_activation_alert_occurrences_alert_key_not_blank_check
    CHECK (length(trim(alert_key)) > 0),
  CONSTRAINT commercial_post_activation_alert_occurrences_severity_check
    CHECK (severity IN ('critical', 'high')),
  CONSTRAINT commercial_post_activation_alert_occurrences_category_check
    CHECK (category IN ('human_escalation', 'milestone_overdue')),
  CONSTRAINT commercial_post_activation_alert_occurrences_observed_order_check
    CHECK (last_observed_at >= opened_at),
  CONSTRAINT commercial_post_activation_alert_occurrences_resolved_order_check
    CHECK (resolved_at IS NULL OR resolved_at >= opened_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS commercial_post_activation_alert_occurrences_alert_uq
  ON commercial_post_activation_alert_occurrences (alert_key);

CREATE INDEX IF NOT EXISTS commercial_post_activation_alert_occurrences_active_idx
  ON commercial_post_activation_alert_occurrences (resolved_at, severity, opened_at);

CREATE INDEX IF NOT EXISTS commercial_post_activation_alert_occurrences_onboarding_idx
  ON commercial_post_activation_alert_occurrences (onboarding_id, opened_at);

ALTER TABLE commercial_post_activation_alert_occurrences ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE commercial_post_activation_alert_occurrences IS
  'Ocorrências duráveis usadas para calcular SLA dos alertas pós-ativação.';

COMMENT ON COLUMN commercial_post_activation_alert_occurrences.opened_at IS
  'Primeiro instante em que a chave do alerta foi observada.';

COMMENT ON COLUMN commercial_post_activation_alert_occurrences.last_observed_at IS
  'Instante mais recente em que o alerta ainda estava ativo.';
