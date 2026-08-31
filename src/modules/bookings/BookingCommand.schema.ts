import { z } from "zod";
export const BookingCommandSourceSchema = z.enum(["panel", "whatsapp", "agent", "api"]);
export const BookingCommandInputSchema = z.object({
  clientId: z.string().trim().min(1), unitId: z.string().trim().min(1).optional().nullable(), professionalId: z.string().trim().min(1).optional().nullable(), serviceId: z.string().trim().min(1), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), notes: z.string().trim().max(2000).optional().nullable(), source: BookingCommandSourceSchema.default("api"), requestId: z.string().trim().min(8).max(100).regex(/^[A-Za-z0-9._:-]+$/).optional(),
});
export type BookingCommandInput = z.infer<typeof BookingCommandInputSchema>;
