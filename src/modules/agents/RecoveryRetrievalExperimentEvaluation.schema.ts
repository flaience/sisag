import { z } from "zod";

export const RecoveryRetrievalExperimentEvaluationSchema = z.object({
  experimentId: z.string().uuid(),
  decision: z.enum(["adopt", "reject", "inconclusive"]),
  reason: z.string().trim().min(3).max(500),
});

export type RecoveryRetrievalExperimentEvaluation = z.infer<typeof RecoveryRetrievalExperimentEvaluationSchema>;
