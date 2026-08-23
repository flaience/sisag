CREATE INDEX IF NOT EXISTS commercial_pa_due_items_outstanding_idx
  ON commercial_post_activation_due_work_items
    (status, due_at, available_at, locked_until, attempts, id)
  WHERE status <> 'completed';

CREATE INDEX IF NOT EXISTS commercial_pa_due_items_completed_at_idx
  ON commercial_post_activation_due_work_items
    (completed_at DESC, id)
  WHERE status = 'completed';

COMMENT ON INDEX commercial_pa_due_items_outstanding_idx IS
  'Caminho quente para indicadores operacionais sem trabalhos encerrados.';
