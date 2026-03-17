//src/modules/appointments/Appointment.schema.ts
import { z } from "zod";

export const AppointmentSchema = z.object({
  professionalId: z.string().uuid(),
  clientId: z.string().uuid(),
  scheduledTime: z.string().datetime(),

  durationMinutes: z
    .number()
    .int()
    .min(1)
    .max(24 * 60)
    .default(30),

  serviceNameSnapshot: z.string().trim().max(255).nullable().optional(),

  status: z
    .enum(["PENDING", "CONFIRMED", "CANCELLED", "RESCHEDULED", "COMPLETED"])
    .optional(),
});

export type AppointmentDTO = z.infer<typeof AppointmentSchema>;
