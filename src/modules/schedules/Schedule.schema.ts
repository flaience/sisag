// src/modules/schedules/Schedule.schema.ts
import { z } from "zod";

export const ScheduleSchema = z.object({
  weekday: z.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export type ScheduleDTO = z.infer<typeof ScheduleSchema>;
