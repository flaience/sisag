BEGIN;
CREATE TABLE IF NOT EXISTS recovery_agent_knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  scope varchar(32) NOT NULL DEFAULT 'recovery', source_type varchar(40) NOT NULL, source_ref varchar(160) NOT NULL,
  title varchar(200) NOT NULL, content text NOT NULL CHECK(char_length(content) BETWEEN 1 AND 2000), content_hash varchar(64) NOT NULL, version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  status varchar(16) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','retired')),
  valid_from timestamptz NOT NULL DEFAULT now(), valid_until timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, source_type, source_ref, version)
);
CREATE INDEX IF NOT EXISTS recovery_agent_knowledge_company_scope_status_idx ON recovery_agent_knowledge_documents(company_id, scope, status, valid_from);
ALTER TABLE recovery_agent_knowledge_documents ENABLE ROW LEVEL SECURITY;
COMMIT;

-- Reversão: DROP TABLE IF EXISTS recovery_agent_knowledge_documents;
