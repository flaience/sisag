import { z } from "zod";

export const SchedulingReadinessQuerySchema = z.object({
  unitId: z.string().uuid(),
  serviceId: z.string().uuid(),
  professionalId: z.string().uuid(),
}).strict();
