import { z } from "zod";
export const RecoveryRetrievalReleaseGraduationReviewSchema = z.object({ id: z.string().uuid(), expectedVersion: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), reason: z.string().trim().min(3).max(500) }).strict();
export type RecoveryRetrievalReleaseGraduationReview = z.infer<typeof RecoveryRetrievalReleaseGraduationReviewSchema>;
