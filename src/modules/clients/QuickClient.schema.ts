import { z } from "zod";
import { normalizePhoneE164 } from "./phone/normalizePhone";

export const QuickClientInputSchema = z.object({
  name: z.string().trim().min(2).max(160),
  whatsapp: z.string().trim().min(8).max(32).transform(normalizePhoneE164).refine((value) => /^\+[1-9]\d{9,14}$/.test(value), "invalid_whatsapp"),
  email: z.union([z.string().trim().email().max(320), z.literal("")]).optional().nullable().transform((value) => value || null),
});
export type QuickClientInput = z.infer<typeof QuickClientInputSchema>;
