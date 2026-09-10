BEGIN;
ALTER TABLE recovery_agent_retrieval_release_graduation_proposals ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1, ADD COLUMN IF NOT EXISTS reviewed_by uuid, ADD COLUMN IF NOT EXISTS reviewed_at timestamptz, ADD COLUMN IF NOT EXISTS review_reason text, ADD COLUMN IF NOT EXISTS reviewed_version integer;
ALTER TABLE recovery_agent_retrieval_release_graduation_proposals DROP CONSTRAINT IF EXISTS recovery_retrieval_release_graduation_review_reason_check;
ALTER TABLE recovery_agent_retrieval_release_graduation_proposals ADD CONSTRAINT recovery_retrieval_release_graduation_review_reason_check CHECK(review_reason IS NULL OR char_length(review_reason) BETWEEN 3 AND 500), ADD CONSTRAINT recovery_retrieval_release_graduation_version_check CHECK(version >= 1), ADD CONSTRAINT recovery_retrieval_release_graduation_reviewed_version_check CHECK(reviewed_version IS NULL OR reviewed_version >= 1);
COMMIT;
