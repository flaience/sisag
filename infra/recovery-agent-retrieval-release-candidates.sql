BEGIN;
CREATE TABLE IF NOT EXISTS recovery_agent_retrieval_release_candidates(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,evaluation_id uuid NOT NULL REFERENCES recovery_agent_retrieval_experiment_evaluations(id),experiment_id uuid NOT NULL REFERENCES recovery_agent_retrieval_shadow_experiments(id),proposal_id uuid NOT NULL REFERENCES recovery_agent_retrieval_change_proposals(id),scope varchar(32) NOT NULL,status varchar(16) NOT NULL DEFAULT 'draft' CHECK(status='draft'),candidate_version varchar(64) NOT NULL,candidate jsonb NOT NULL,evidence jsonb NOT NULL,reason text NOT NULL CHECK(char_length(reason) BETWEEN 3 AND 500),created_by uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS recovery_retrieval_release_candidates_evaluation_uq ON recovery_agent_retrieval_release_candidates(evaluation_id);
CREATE INDEX IF NOT EXISTS recovery_retrieval_release_candidates_company_idx ON recovery_agent_retrieval_release_candidates(company_id,created_at DESC);
ALTER TABLE recovery_agent_retrieval_release_candidates ENABLE ROW LEVEL SECURITY;
COMMIT;
