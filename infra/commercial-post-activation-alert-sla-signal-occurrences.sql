CREATE TABLE IF NOT EXISTS commercial_post_activation_alert_sla_signal_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_key varchar(600) NOT NULL,
  alert_key varchar(500) NOT NULL REFERENCES commercial_post_activation_alert_occurrences(alert_key) ON DELETE CASCADE,
  signal_type varchar(40) NOT NULL,
  severity varchar(20) NOT NULL,
  first_observed_at timestamptz NOT NULL,
  last_observed_at timestamptz NOT NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commercial_post_activation_alert_sla_signal_occurrences_key_not_blank_check
    CHECK (length(trim(signal_key)) > 0),
  CONSTRAINT commercial_post_activation_alert_sla_signal_occurrences_type_check
    CHECK (signal_type IN ('acknowledgement_breached', 'resolution_breached')),
  CONSTRAINT commercial_post_activation_alert_sla_signal_occurrences_severity_check
    CHECK (severity IN ('critical', 'high')),
  CONSTRAINT commercial_post_activation_alert_sla_signal_occurrences_observed_order_check
    CHECK (last_observed_at >= first_observed_at),
  CONSTRAINT commercial_post_activation_alert_sla_signal_occurrences_resolved_order_check
    CHECK (resolved_at IS NULL OR resolved_at >= first_observed_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS commercial_post_activation_alert_sla_signal_occurrences_signal_uq
  ON commercial_post_activation_alert_sla_signal_occurrences (signal_key);

CREATE INDEX IF NOT EXISTS commercial_post_activation_alert_sla_signal_occurrences_active_idx
  ON commercial_post_activation_alert_sla_signal_occurrences (resolved_at, severity, first_observed_at);

CREATE INDEX IF NOT EXISTS commercial_post_activation_alert_sla_signal_occurrences_alert_idx
  ON commercial_post_activation_alert_sla_signal_occurrences (alert_key, first_observed_at);

ALTER TABLE commercial_post_activation_alert_sla_signal_occurrences ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE commercial_post_activation_alert_sla_signal_occurrences IS
  'Ocorrências duráveis dos sinais acionáveis de SLA para deduplicação operacional.';

COMMENT ON COLUMN commercial_post_activation_alert_sla_signal_occurrences.first_observed_at IS
  'Primeiro instante em que a violação de SLA foi observada como acionável.';

COMMENT ON COLUMN commercial_post_activation_alert_sla_signal_occurrences.resolved_at IS
  'Instante em que o sinal deixou de ser acionável.';
