CREATE TABLE IF NOT EXISTS commercial_post_activation_runner_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_key varchar(100) NOT NULL,
  execution_key varchar(200) NOT NULL,
  summary jsonb NOT NULL,
  metrics jsonb NOT NULL,
  executed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commercial_post_activation_runner_runs_runner_key_format_check
    CHECK (runner_key ~ '^[a-z0-9][a-z0-9_-]*$'),
  CONSTRAINT commercial_post_activation_runner_runs_execution_key_not_blank_check
    CHECK (length(trim(execution_key)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS commercial_post_activation_runner_runs_execution_uq
  ON commercial_post_activation_runner_runs (execution_key);

CREATE INDEX IF NOT EXISTS commercial_post_activation_runner_runs_runner_executed_idx
  ON commercial_post_activation_runner_runs (runner_key, executed_at);

ALTER TABLE commercial_post_activation_runner_runs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE commercial_post_activation_runner_runs IS
  'Histórico interno e idempotente das métricas do runner pós-ativação.';

COMMENT ON COLUMN commercial_post_activation_runner_runs.execution_key IS
  'Identidade durável da execução fornecida pelo orquestrador.';
