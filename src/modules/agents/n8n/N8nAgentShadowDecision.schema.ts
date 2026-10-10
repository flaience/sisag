import { z } from "zod";
import { N8nAgentRequestSchema } from "./N8nAgentFoundation.contract";

export const N8nAgentShadowDecisionInputSchema = z.object({ request: N8nAgentRequestSchema }).strict();

const ToolNameSchema = z.enum(["scheduling.find_available_slots", "scheduling.explain_appointment_status"]);
const SlotsArgumentsSchema = z.object({
  professionalId: z.string().uuid().nullable(), unitId: z.string().uuid().nullable(), serviceId: z.string().uuid().nullable(), resourceId: z.string().uuid().nullable(),
  dateFrom: z.string().datetime({ offset: true }), dateTo: z.string().datetime({ offset: true }), durationMinutes: z.number().int().positive().max(1440).nullable(), limit: z.number().int().min(1).max(20), stepMinutes: z.number().int().positive().max(1440).nullable(),
}).strict();
const AppointmentArgumentsSchema = z.object({ appointmentId: z.string().uuid() }).strict();
export const N8nAgentShadowDecisionSchema = z.object({
  action: z.enum(["answer_from_knowledge", "request_read_only_tool", "clarify", "handoff"]),
  toolName: ToolNameSchema.nullable(),
  toolArguments: z.union([SlotsArgumentsSchema, AppointmentArgumentsSchema]).nullable(),
  answerDraft: z.string().trim().min(1).max(800).nullable(),
  clarificationQuestion: z.string().trim().min(1).max(300).nullable(),
  confidence: z.number().min(0).max(1),
  reasonCode: z.enum(["approved_knowledge", "availability_required", "appointment_status_required", "missing_information", "unsupported_request", "provider_unavailable", "provider_error", "invalid_output"]),
}).strict().superRefine((value, context) => {
  if (value.action === "answer_from_knowledge" && (!value.answerDraft || value.toolName || value.toolArguments)) context.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_knowledge_answer" });
  if (value.action === "request_read_only_tool" && (!value.toolName || !value.toolArguments || value.answerDraft || value.clarificationQuestion)) context.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_tool_request" });
  if (value.toolName === "scheduling.find_available_slots" && value.toolArguments && !("dateFrom" in value.toolArguments)) context.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_slots_arguments" });
  if (value.toolName === "scheduling.explain_appointment_status" && value.toolArguments && !("appointmentId" in value.toolArguments)) context.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_appointment_arguments" });
  if (value.action === "clarify" && (!value.clarificationQuestion || value.toolName || value.toolArguments || value.answerDraft)) context.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_clarification" });
  if (value.action === "handoff" && (value.toolName || value.toolArguments || value.answerDraft || value.clarificationQuestion)) context.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_handoff" });
});

export const N8nAgentShadowDecisionJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    action: { type: "string", enum: ["answer_from_knowledge", "request_read_only_tool", "clarify", "handoff"] },
    toolName: { anyOf: [{ type: "string", enum: ["scheduling.find_available_slots", "scheduling.explain_appointment_status"] }, { type: "null" }] },
    toolArguments: { anyOf: [
      { type: "object", additionalProperties: false, properties: { professionalId: { anyOf: [{ type: "string", format: "uuid" }, { type: "null" }] }, unitId: { anyOf: [{ type: "string", format: "uuid" }, { type: "null" }] }, serviceId: { anyOf: [{ type: "string", format: "uuid" }, { type: "null" }] }, resourceId: { anyOf: [{ type: "string", format: "uuid" }, { type: "null" }] }, dateFrom: { type: "string" }, dateTo: { type: "string" }, durationMinutes: { anyOf: [{ type: "integer", minimum: 1, maximum: 1440 }, { type: "null" }] }, limit: { type: "integer", minimum: 1, maximum: 20 }, stepMinutes: { anyOf: [{ type: "integer", minimum: 1, maximum: 1440 }, { type: "null" }] } }, required: ["professionalId", "unitId", "serviceId", "resourceId", "dateFrom", "dateTo", "durationMinutes", "limit", "stepMinutes"] },
      { type: "object", additionalProperties: false, properties: { appointmentId: { type: "string", format: "uuid" } }, required: ["appointmentId"] },
      { type: "null" },
    ] },
    answerDraft: { anyOf: [{ type: "string", minLength: 1, maxLength: 800 }, { type: "null" }] },
    clarificationQuestion: { anyOf: [{ type: "string", minLength: 1, maxLength: 300 }, { type: "null" }] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    reasonCode: { type: "string", enum: ["approved_knowledge", "availability_required", "appointment_status_required", "missing_information", "unsupported_request"] },
  },
  required: ["action", "toolName", "toolArguments", "answerDraft", "clarificationQuestion", "confidence", "reasonCode"],
} as const;

export type N8nAgentShadowDecisionInput = z.infer<typeof N8nAgentShadowDecisionInputSchema>;
export type N8nAgentShadowDecision = z.infer<typeof N8nAgentShadowDecisionSchema>;
