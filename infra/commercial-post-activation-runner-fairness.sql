ALTER TABLE commercial_post_activation_runner_runs
  ADD COLUMN IF NOT EXISTS fairness jsonb;

ALTER TABLE commercial_post_activation_runner_runs
  ADD COLUMN IF NOT EXISTS fairness_recorded_at timestamptz;

COMMENT ON COLUMN commercial_post_activation_runner_runs.fairness IS
  'Métricas de avanço do cursor, ciclos completos e possível starvation.';

COMMENT ON COLUMN commercial_post_activation_runner_runs.fairness_recorded_at IS
  'Horário em que as métricas de justiça foram anexadas à execução.';
