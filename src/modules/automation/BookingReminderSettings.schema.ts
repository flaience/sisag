import { z } from "zod";

export const DEFAULT_BOOKING_REMINDER_TEMPLATE = "Olá, {{nome}}! Lembramos que seu atendimento está marcado para {{data_hora}}. Responda *SIM* para confirmar ou *CANCELAR* se não puder comparecer.";
export const BookingReminderSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  hoursBefore: z.coerce.number().int().min(1).max(168).default(24),
  template: z.string().trim().min(20).max(600).default(DEFAULT_BOOKING_REMINDER_TEMPLATE),
});
export type BookingReminderSettings = z.infer<typeof BookingReminderSettingsSchema>;
