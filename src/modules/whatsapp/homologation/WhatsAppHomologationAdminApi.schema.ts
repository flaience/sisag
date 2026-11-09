import { z } from "zod";

export const WhatsAppHomologationAdminCommandSchema = z.object({
  whatsappAccountId: z.string().uuid(),
  senderPhoneE164: z.string().regex(/^\+[1-9]\d{7,14}$/),
  text: z.string().trim().min(1).max(4096),
}).strict();

export type WhatsAppHomologationAdminCommand = z.infer<typeof WhatsAppHomologationAdminCommandSchema>;
