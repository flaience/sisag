BEGIN;
ALTER TABLE recovery_agent_retrieval_change_proposals ADD COLUMN IF NOT EXISTS reviewed_by uuid,ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,ADD COLUMN IF NOT EXISTS review_reason text;
ALTER TABLE recovery_agent_retrieval_change_proposals DROP CONSTRAINT IF EXISTS recovery_retrieval_change_proposals_status_check;
ALTER TABLE recovery_agent_retrieval_change_proposals ADD CONSTRAINT recovery_retrieval_change_proposals_status_check CHECK(status IN ('proposed','approved','rejected'));
ALTER TABLE recovery_agent_retrieval_change_proposals DROP CONSTRAINT IF EXISTS recovery_retrieval_change_proposals_review_reason_check;
ALTER TABLE recovery_agent_retrieval_change_proposals ADD CONSTRAINT recovery_retrieval_change_proposals_review_reason_check CHECK(review_reason IS NULL OR char_length(review_reason) BETWEEN 3 AND 500);
COMMIT;
