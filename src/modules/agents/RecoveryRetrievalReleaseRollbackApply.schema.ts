import { z } from "zod";

export const RecoveryRetrievalReleaseRollbackApplySchema = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
}).strict();

export type RecoveryRetrievalReleaseRollbackApply = z.infer<typeof RecoveryRetrievalReleaseRollbackApplySchema>;
