import { z } from "zod";
const Time = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/);
export const ScheduleSchema = z.object({ unitId: z.string().uuid().optional(), weekday: z.coerce.number().int().min(0).max(6), startTime: Time, endTime: Time }).superRefine((value, context) => { if (value.startTime >= value.endTime) context.addIssue({ code: "custom", path: ["endTime"], message: "end_time_must_be_after_start_time" }); });
export type ScheduleDTO = z.infer<typeof ScheduleSchema>;
