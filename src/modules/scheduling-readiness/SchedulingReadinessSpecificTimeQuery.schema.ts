import { z } from "zod";
export const SchedulingReadinessSpecificTimeQuerySchema = z.object({
  unitId: z.string().uuid(),
  serviceId: z.string().uuid(),
  professionalId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
}).strict();
