import { z } from "zod";
import { N8nAgentEvidenceSchema, N8nAgentRequestSchema } from "./N8nAgentFoundation.contract";

const optionalUuid = z.string().uuid().nullish();
const FindAvailableSlotsToolSchema = z.object({
  name: z.literal("scheduling.find_available_slots"),
  arguments: z.object({
    professionalId: optionalUuid, unitId: optionalUuid, serviceId: optionalUuid,
    resourceId: z.string().uuid().nullish(), dateFrom: z.string().min(10).max(40), dateTo: z.string().min(10).max(40),
    durationMinutes: z.number().int().positive().max(1440).nullish(), limit: z.number().int().positive().max(100).optional(), stepMinutes: z.number().int().positive().max(1440).optional(),
  }).strict(),
}).strict();

const ExplainAppointmentStatusToolSchema = z.object({
  name: z.literal("scheduling.explain_appointment_status"),
  arguments: z.object({ appointmentId: z.string().uuid() }).strict(),
}).strict();

export const N8nAgentReadOnlyGatewaySchema = z.object({
  request: N8nAgentRequestSchema,
  evidence: z.array(N8nAgentEvidenceSchema).max(8),
  toolCall: z.discriminatedUnion("name", [FindAvailableSlotsToolSchema, ExplainAppointmentStatusToolSchema]),
}).strict();

export type N8nAgentReadOnlyGatewayInput = z.infer<typeof N8nAgentReadOnlyGatewaySchema>;
