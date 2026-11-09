import { z } from "zod";

export const WhatsAppHomologationMessageSchema = z.object({
  companyId: z.string().uuid(),
  whatsappAccountId: z.string().uuid(),
  senderPhoneE164: z.string().regex(/^\+[1-9]\d{7,14}$/),
  text: z.string().trim().min(1).max(4096),
  correlationId: z.string().regex(/^homolog:[a-zA-Z0-9._:-]{1,180}$/),
}).strict();

export type WhatsAppHomologationMessage = z.infer<typeof WhatsAppHomologationMessageSchema>;

export const WhatsAppHomologationEnvelopeSchema = z.object({
  mode: z.literal("homologation"),
  transport: z.literal("internal"),
  externalDispatchAllowed: z.literal(false),
  message: WhatsAppHomologationMessageSchema,
}).strict();

export type WhatsAppHomologationEnvelope = z.infer<typeof WhatsAppHomologationEnvelopeSchema>;
