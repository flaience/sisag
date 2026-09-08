import { z } from "zod";
export const RecoveryRetrievalReleaseRollbackProposalSchema = z.object({ planId: z.string().uuid(), proposedRolloutPercent: z.number().int().min(1).max(99), reason: z.string().trim().min(3).max(500) }).strict();
export type RecoveryRetrievalReleaseRollbackProposal = z.infer<typeof RecoveryRetrievalReleaseRollbackProposalSchema>;
