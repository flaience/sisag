import { z } from "zod";

export const AppointmentSchema = z.object({
  professionalId: z.string().uuid(),
  clientId: z.string().uuid(),
  scheduledTime: z.string().datetime(),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "NO_SHOW"]).optional(),
});

export type AppointmentDTO = z.infer<typeof AppointmentSchema>;
