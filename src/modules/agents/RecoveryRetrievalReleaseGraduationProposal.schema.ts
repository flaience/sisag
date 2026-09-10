import { z } from "zod";
export const RecoveryRetrievalReleaseGraduationProposalSchema = z.object({ planId: z.string().uuid(), reason: z.string().trim().min(3).max(500) }).strict();
export type RecoveryRetrievalReleaseGraduationProposal = z.infer<typeof RecoveryRetrievalReleaseGraduationProposalSchema>;
