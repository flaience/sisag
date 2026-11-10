import { z } from "zod";

const HomologationContextSchema = z.object({
  priorUserText: z.string().trim().min(1).max(4096),
  priorAssistantText: z.string().trim().min(1).max(500),
}).strict();

export const WhatsAppHomologationAdminCommandSchema = z.object({
  senderPhoneE164: z.string().regex(/^\+[1-9]\d{7,14}$/),
  text: z.string().trim().min(1).max(4096),
  context: HomologationContextSchema.optional(),
}).strict();

export type WhatsAppHomologationAdminCommand = z.infer<typeof WhatsAppHomologationAdminCommandSchema>;
