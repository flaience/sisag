import { z } from "zod";

const DecisionMetadataSchema = z.object({
  action: z.enum(["answer_from_knowledge", "request_read_only_tool", "clarify", "handoff"]),
  toolName: z.enum(["scheduling.find_available_slots", "scheduling.explain_appointment_status", "scheduling.prepare_rescheduling", "scheduling.list_upcoming_appointments", "scheduling.select_appointment"]).nullable(),
  reasonCode: z.string().regex(/^[a-z0-9_]{1,64}$/),
  confidence: z.number().min(0).max(1),
}).strict();

const AnswerCandidateSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("availability"), status: z.enum(["ready", "empty", "clarify", "failed"]), text: z.string().trim().min(1).max(500), slotCount: z.number().int().min(0).max(100), source: z.enum(["read_only_tool", "shadow_policy"]) }).strict(),
  z.object({ kind: z.literal("appointment_status"), status: z.enum(["ready", "not_found", "failed"]), text: z.string().trim().min(1).max(500), appointmentStatus: z.string().trim().min(1).max(32).nullable(), startsAt: z.string().datetime().nullable(), source: z.literal("read_only_tool") }).strict(),
  z.object({ kind: z.literal("upcoming_appointments"), status: z.enum(["ready", "empty", "failed"]), text: z.string().trim().min(1).max(500), appointmentCount: z.number().int().min(0).max(5), source: z.literal("read_only_tool") }).strict(),
  z.object({ kind: z.literal("appointment_selection"), status: z.enum(["selected", "selection_required", "not_found_or_ambiguous", "failed"]), text: z.string().trim().min(1).max(500), appointmentStatus: z.enum(["PENDING", "CONFIRMED"]).nullable(), startsAt: z.string().datetime().nullable(), source: z.literal("read_only_tool") }).strict(),
]);

const BookingConfirmationProposalSchema = z.object({
  kind: z.literal("booking_confirmation"),
  status: z.literal("awaiting_explicit_confirmation"),
  draft: z.object({ serviceId: z.string().uuid(), startTime: z.string().datetime(), requestId: z.string().trim().min(1).max(500) }).strict(),
  text: z.string().trim().min(1).max(500),
  selectedSlot: z.object({ startsAt: z.string().datetime(), endsAt: z.string().datetime(), serviceId: z.string().uuid(), professionalId: z.string().uuid().nullable().optional(), unitId: z.string().uuid().nullable().optional() }).strict(),
  dispatchAllowed: z.boolean(),
  bookingExecutionAllowed: z.literal(false),
}).strict();

const BookingCancellationProposalSchema = z.object({
  kind: z.literal("booking_cancellation"),
  status: z.literal("awaiting_explicit_confirmation"),
  draft: z.object({ appointmentId: z.string().uuid(), requestId: z.string().trim().min(1).max(500) }).strict(),
  text: z.string().trim().min(1).max(500),
  appointment: z.object({ appointmentId: z.string().uuid(), status: z.enum(["PENDING", "CONFIRMED"]), startsAt: z.string().datetime(), serviceName: z.string().trim().min(1).max(120).nullable().optional() }).strict(),
  dispatchAllowed: z.boolean(),
  cancellationExecutionAllowed: z.literal(false),
}).strict();

const BookingReschedulingProposalSchema = z.object({
  kind: z.literal("booking_rescheduling"),
  status: z.literal("awaiting_explicit_confirmation"),
  draft: z.object({ appointmentId: z.string().uuid(), serviceId: z.string().uuid(), newStartTime: z.string().datetime(), requestId: z.string().trim().min(1).max(500) }).strict(),
  text: z.string().trim().min(1).max(500),
  appointment: z.object({ appointmentId: z.string().uuid(), status: z.enum(["PENDING", "CONFIRMED"]), startsAt: z.string().datetime(), serviceId: z.string().uuid(), serviceName: z.string().trim().min(1).max(120).nullable().optional() }).strict(),
  selectedSlot: z.object({ startsAt: z.string().datetime(), endsAt: z.string().datetime(), serviceId: z.string().uuid(), professionalId: z.string().uuid().nullable().optional(), unitId: z.string().uuid().nullable().optional() }).strict(),
  dispatchAllowed: z.boolean(),
  reschedulingExecutionAllowed: z.literal(false),
}).strict();

const ToolObservationSchema = z.object({
  requested: z.boolean(), status: z.enum(["skipped", "succeeded", "failed"]), errorCode: z.string().regex(/^[A-Za-z0-9_]{1,64}$/).nullable(), policyVersion: z.string().regex(/^[a-z0-9_]{1,80}$/).nullable(),
}).strict();

const ExecutionMetadataSchema = z.object({
  mode: z.enum(["ai", "fallback"]),
  provider: z.string().trim().min(1).max(40),
  model: z.string().trim().min(1).max(80).nullable(),
  promptVersion: z.string().regex(/^[a-z0-9_]{1,80}$/),
  durationMs: z.number().int().min(0).max(30_000),
  errorCode: z.string().regex(/^[a-z0-9_]{1,64}$/).nullable(),
}).strict();

export const N8nAgentShadowMirrorResponseSchema = z.object({
  accepted: z.literal(true),
  mode: z.literal("shadow"),
  correlationId: z.string().min(8).max(240),
  sideEffects: z.literal("none"),
  decision: DecisionMetadataSchema,
  execution: ExecutionMetadataSchema,
  toolObservation: ToolObservationSchema,
  answerCandidate: AnswerCandidateSchema.nullable().optional(),
  bookingConfirmationProposal: BookingConfirmationProposalSchema.nullable().optional(),
  bookingCancellationProposal: BookingCancellationProposalSchema.nullable().optional(),
  bookingReschedulingProposal: BookingReschedulingProposalSchema.nullable().optional(),
}).strict();

export type N8nAgentShadowDecisionMetadata = z.infer<typeof DecisionMetadataSchema>;
export type N8nAgentShadowExecutionMetadata = z.infer<typeof ExecutionMetadataSchema>;
export type N8nAgentShadowToolObservation = z.infer<typeof ToolObservationSchema>;
export type N8nAgentShadowAnswerCandidate = z.infer<typeof AnswerCandidateSchema>;
export type N8nAgentShadowBookingConfirmationProposal = z.infer<typeof BookingConfirmationProposalSchema>;
export type N8nAgentShadowBookingCancellationProposal = z.infer<typeof BookingCancellationProposalSchema>;
export type N8nAgentShadowBookingReschedulingProposal = z.infer<typeof BookingReschedulingProposalSchema>;
