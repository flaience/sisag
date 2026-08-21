CREATE TABLE IF NOT EXISTS commercial_post_activation_runner_leases (
  runner_key varchar(100) PRIMARY KEY,
  owner_key varchar(200) NOT NULL,
  acquired_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commercial_post_activation_runner_leases_runner_key_check
    CHECK (runner_key ~ '^[a-z0-9][a-z0-9_-]*$'),
  CONSTRAINT commercial_post_activation_runner_leases_owner_key_check
    CHECK (length(trim(owner_key)) > 0),
  CONSTRAINT commercial_post_activation_runner_leases_expiry_check
    CHECK (expires_at > acquired_at)
);

CREATE INDEX IF NOT EXISTS commercial_post_activation_runner_leases_expires_idx
  ON commercial_post_activation_runner_leases (expires_at);

ALTER TABLE commercial_post_activation_runner_leases ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE commercial_post_activation_runner_leases IS
  'Leases internas que impedem execuções simultâneas do mesmo runner.';

COMMENT ON COLUMN commercial_post_activation_runner_leases.owner_key IS
  'Identidade da execução autorizada a renovar ou liberar a lease.';

COMMENT ON COLUMN commercial_post_activation_runner_leases.expires_at IS
  'Prazo que permite recuperação automática depois de uma interrupção.';
