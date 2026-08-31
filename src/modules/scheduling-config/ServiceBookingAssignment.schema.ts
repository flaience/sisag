import { z } from "zod";

const time = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/);

export type ServiceBookingAssignmentInput = {
  unitId: string;
  serviceId: string | null;
  professionalId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  priority: number;
  active: boolean;
};

export const ServiceBookingAssignmentInputSchema = z.object({
  unitId: z.string().uuid(),
  serviceId: z.string().uuid().nullable().optional(),
  professionalId: z.string().uuid(),
  weekday: z.number().int().min(0).max(6),
  startTime: time,
  endTime: time,
  priority: z.number().int().min(1).max(1000).optional(),
  active: z.boolean().optional(),
}).superRefine((value, context) => {
  if (value.startTime >= value.endTime) context.addIssue({ code: "custom", path: ["endTime"], message: "end_must_be_after_start" });
}).transform((value): ServiceBookingAssignmentInput => ({
  unitId: value.unitId!,
  serviceId: value.serviceId ?? null,
  professionalId: value.professionalId!,
  weekday: value.weekday!,
  startTime: value.startTime!,
  endTime: value.endTime!,
  priority: value.priority ?? 100,
  active: value.active ?? true,
}));

export const ServiceBookingAssignmentFilterSchema = z.object({
  unitId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  professionalId: z.string().uuid().optional(),
  status: z.enum(["active", "inactive", "all"]).default("active"),
});

export type ServiceBookingAssignmentFilter = z.infer<typeof ServiceBookingAssignmentFilterSchema>;
