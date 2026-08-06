import { z } from "zod";

export const SchedulingConfigInputSchema = z.object({
  slotDurationMinutes: z.coerce.number().int().min(5).max(480),
  bufferMinutes: z.coerce.number().int().min(0).max(240),
  allowOverbooking: z.boolean(),
  maxAdvanceDays: z.coerce.number().int().min(1).max(730),
  minCancelAdvanceMinutes: z.coerce.number().int().min(0).max(43_200),
});

export type SchedulingConfigInput = z.infer<
  typeof SchedulingConfigInputSchema
>;
