ALTER TABLE commercial_post_activation_runner_runs
  ADD COLUMN IF NOT EXISTS capacity jsonb;

ALTER TABLE commercial_post_activation_runner_runs
  ADD COLUMN IF NOT EXISTS capacity_recorded_at timestamptz;

COMMENT ON COLUMN commercial_post_activation_runner_runs.capacity IS
  'Métricas de duração, utilização do lote e possível backlog da execução.';

COMMENT ON COLUMN commercial_post_activation_runner_runs.capacity_recorded_at IS
  'Horário em que as métricas de capacidade foram anexadas à execução.';
