import { z } from "zod";
export const RecoveryRetrievalEvaluationSchema=z.object({recommendationVersion:z.number().int().positive(),documentId:z.string().uuid(),strategy:z.enum(["lexical","vector"]),relevance:z.enum(["relevant","partially_relevant","irrelevant"]),note:z.string().trim().max(500).optional()});
export type RecoveryRetrievalEvaluation=z.infer<typeof RecoveryRetrievalEvaluationSchema>;
