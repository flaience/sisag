import { z } from "zod";
import { N8nAgentRequestSchema } from "./N8nAgentFoundation.contract";

const optionalUuid = z.string().uuid().nullish();
const FindAvailableSlotsToolSchema = z.object({
  name: z.literal("scheduling.find_available_slots"),
  arguments: z.object({
    professionalId: optionalUuid,
    unitId: optionalUuid,
    serviceId: optionalUuid,
    resourceId: z.string().uuid().nullish(),
    dateFrom: z.string().min(10).max(40),
    dateTo: z.string().min(10).max(40),
    durationMinutes: z.number().int().positive().max(1440).nullish(),
    limit: z.number().int().positive().max(100).optional(),
    stepMinutes: z.number().int().positive().max(1440).optional(),
  }).strict(),
}).strict();

const PrepareReschedulingToolSchema = z.object({
  name: z.literal("scheduling.prepare_rescheduling"),
  arguments: z.object({
    dateFrom: z.string().min(10).max(40),
    dateTo: z.string().min(10).max(40),
    limit: z.number().int().positive().max(20).optional(),
  }).strict(),
}).strict();

const ExplainAppointmentStatusToolSchema = z.object({
  name: z.literal("scheduling.explain_appointment_status"),
  arguments: z.object({ appointmentId: z.string().uuid().nullable() }).strict(),
}).strict();

export const N8nAgentReadOnlyGatewaySchema = z.object({
  request: N8nAgentRequestSchema,
  toolCall: z.discriminatedUnion("name", [FindAvailableSlotsToolSchema, ExplainAppointmentStatusToolSchema, PrepareReschedulingToolSchema]),
}).strict();

export type N8nAgentReadOnlyGatewayInput = z.infer<typeof N8nAgentReadOnlyGatewaySchema>;
