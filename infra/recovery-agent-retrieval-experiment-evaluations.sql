BEGIN;
CREATE TABLE IF NOT EXISTS recovery_agent_retrieval_experiment_evaluations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,experiment_id uuid NOT NULL REFERENCES recovery_agent_retrieval_shadow_experiments(id),proposal_id uuid NOT NULL REFERENCES recovery_agent_retrieval_change_proposals(id),decision varchar(16) NOT NULL CHECK(decision IN ('adopt','reject','inconclusive')),reason text NOT NULL CHECK(char_length(reason) BETWEEN 3 AND 500),evidence jsonb NOT NULL,evaluated_by uuid NOT NULL,evaluated_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS recovery_retrieval_experiment_evaluations_experiment_uq ON recovery_agent_retrieval_experiment_evaluations(experiment_id);
CREATE INDEX IF NOT EXISTS recovery_retrieval_experiment_evaluations_company_idx ON recovery_agent_retrieval_experiment_evaluations(company_id,evaluated_at DESC);
ALTER TABLE recovery_agent_retrieval_experiment_evaluations ENABLE ROW LEVEL SECURITY;
COMMIT;
