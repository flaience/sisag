import { z } from "zod";
export const DEFAULT_BOOKING_FOLLOWUP_TEMPLATE = "Olá, {{nome}}! Agradecemos pela confiança. Como foi sua experiência? Responda com uma nota de *1 a 5*.";
export const BookingFollowupSettingsSchema = z.object({ enabled: z.boolean().default(false), hoursAfter: z.coerce.number().int().min(0).max(720).default(24), template: z.string().trim().min(20).max(600).default(DEFAULT_BOOKING_FOLLOWUP_TEMPLATE) });
export type BookingFollowupSettings = z.infer<typeof BookingFollowupSettingsSchema>;
