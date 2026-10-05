import { z } from "zod";

export const N8N_AGENT_FOUNDATION_VERSION = "n8n_agent_foundation_v1" as const;

const TrustedContextSchema = z.object({
  companyId: z.string().uuid(),
  whatsappAccountId: z.string().uuid(),
  channel: z.literal("whatsapp"),
  senderPhoneE164: z.string().regex(/^\+[1-9]\d{7,14}$/),
  correlationId: z.string().min(8).max(200),
  receivedAt: z.coerce.date(),
  timeZone: z.string().min(3).max(80),
}).strict();

export const N8nAgentRequestSchema = z.object({
  policyVersion: z.literal(N8N_AGENT_FOUNDATION_VERSION),
  trustedContext: TrustedContextSchema,
  message: z.object({
    providerMessageId: z.string().min(8).max(240),
    text: z.string().trim().min(1).max(4000),
  }).strict(),
}).strict();

export const N8nAgentEvidenceSchema = z.object({
  companyId: z.string().uuid(),
  documentId: z.string().uuid(),
  version: z.number().int().positive(),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.literal("approved"),
  title: z.string().min(1).max(200),
  excerpt: z.string().min(1).max(1200),
}).strict();

export type N8nAgentRequest = z.infer<typeof N8nAgentRequestSchema>;
export type N8nAgentEvidence = z.infer<typeof N8nAgentEvidenceSchema>;

export function validateN8nAgentEvidenceTenant(companyId: string, evidence: N8nAgentEvidence[]) {
  return evidence.length <= 8 && evidence.every((item) => item.companyId === companyId && item.status === "approved");
}
