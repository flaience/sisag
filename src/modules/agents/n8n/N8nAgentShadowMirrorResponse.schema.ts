import { z } from "zod";

const DecisionMetadataSchema = z.object({
  action: z.enum(["answer_from_knowledge", "request_read_only_tool", "clarify", "handoff"]),
  toolName: z.enum(["scheduling.find_available_slots", "scheduling.explain_appointment_status"]).nullable(),
  reasonCode: z.string().regex(/^[a-z0-9_]{1,64}$/),
  confidence: z.number().min(0).max(1),
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
}).strict();

export type N8nAgentShadowDecisionMetadata = z.infer<typeof DecisionMetadataSchema>;
export type N8nAgentShadowExecutionMetadata = z.infer<typeof ExecutionMetadataSchema>;
