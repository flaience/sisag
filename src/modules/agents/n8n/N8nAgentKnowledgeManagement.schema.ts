import { z } from "zod";
export const N8nAgentKnowledgeCreateSchema = z.object({
  sourceType: z.string().trim().min(2).max(40),
  sourceRef: z.string().trim().min(2).max(160),
  title: z.string().trim().min(3).max(200),
  content: z.string().trim().min(1).max(8000),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().nullable().optional(),
}).strict().refine((value) => !value.validUntil || !value.validFrom || value.validUntil > value.validFrom, { message: "invalid_validity" });
export const N8nAgentKnowledgeStatusSchema = z.object({ action: z.enum(["approve", "retire"]) }).strict();
