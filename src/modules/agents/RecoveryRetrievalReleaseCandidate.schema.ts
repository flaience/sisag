import { z } from "zod";
export const RecoveryRetrievalReleaseCandidateSchema=z.object({evaluationId:z.string().uuid(),reason:z.string().trim().min(3).max(500)}).strict();
export type RecoveryRetrievalReleaseCandidateInput=z.infer<typeof RecoveryRetrievalReleaseCandidateSchema>;
