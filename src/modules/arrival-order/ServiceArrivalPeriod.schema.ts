import { z } from "zod";

const time = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/);

export type ServiceArrivalPeriodInput = {
  unitId: string;
  serviceId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  capacity: number | null;
  active: boolean;
};

export const ServiceArrivalPeriodInputSchema = z.object({
  unitId: z.string().uuid(),
  serviceId: z.string().uuid(),
  weekday: z.coerce.number().int().min(0).max(6),
  startTime: time,
  endTime: time,
  capacity: z.union([z.literal(""), z.null(), z.undefined(), z.coerce.number().int().min(1).max(10000)]),
  active: z.boolean().optional(),
}).superRefine((value, context) => {
  if (value.startTime >= value.endTime) context.addIssue({ code: "custom", path: ["endTime"], message: "end_must_be_after_start" });
}).transform((value): ServiceArrivalPeriodInput => ({
  unitId: value.unitId,
  serviceId: value.serviceId,
  weekday: value.weekday,
  startTime: value.startTime,
  endTime: value.endTime,
  capacity: typeof value.capacity === "number" ? value.capacity : null,
  active: value.active ?? true,
}));

export const ServiceArrivalPeriodFilterSchema = z.object({
  unitId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  weekday: z.coerce.number().int().min(0).max(6).optional(),
  status: z.enum(["active", "inactive", "all"]).default("active"),
});

export type ServiceArrivalPeriodFilter = z.infer<typeof ServiceArrivalPeriodFilterSchema>;
