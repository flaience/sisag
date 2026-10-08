import { z } from "zod";
import { N8nAgentRequestSchema } from "./N8nAgentFoundation.contract";

export const N8nAgentShadowDecisionInputSchema = z.object({ request: N8nAgentRequestSchema }).strict();

const ToolNameSchema = z.enum(["scheduling.find_available_slots", "scheduling.explain_appointment_status"]);
export const N8nAgentShadowDecisionSchema = z.object({
  action: z.enum(["answer_from_knowledge", "request_read_only_tool", "clarify", "handoff"]),
  toolName: ToolNameSchema.nullable(),
  answerDraft: z.string().trim().min(1).max(800).nullable(),
  clarificationQuestion: z.string().trim().min(1).max(300).nullable(),
  confidence: z.number().min(0).max(1),
  reasonCode: z.enum(["approved_knowledge", "availability_required", "appointment_status_required", "missing_information", "unsupported_request", "provider_unavailable", "provider_error", "invalid_output"]),
}).strict().superRefine((value, context) => {
  if (value.action === "answer_from_knowledge" && (!value.answerDraft || value.toolName)) context.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_knowledge_answer" });
  if (value.action === "request_read_only_tool" && (!value.toolName || value.answerDraft || value.clarificationQuestion)) context.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_tool_request" });
  if (value.action === "clarify" && (!value.clarificationQuestion || value.toolName || value.answerDraft)) context.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_clarification" });
  if (value.action === "handoff" && (value.toolName || value.answerDraft || value.clarificationQuestion)) context.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_handoff" });
});

export const N8nAgentShadowDecisionJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    action: { type: "string", enum: ["answer_from_knowledge", "request_read_only_tool", "clarify", "handoff"] },
    toolName: { anyOf: [{ type: "string", enum: ["scheduling.find_available_slots", "scheduling.explain_appointment_status"] }, { type: "null" }] },
    answerDraft: { anyOf: [{ type: "string", minLength: 1, maxLength: 800 }, { type: "null" }] },
    clarificationQuestion: { anyOf: [{ type: "string", minLength: 1, maxLength: 300 }, { type: "null" }] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    reasonCode: { type: "string", enum: ["approved_knowledge", "availability_required", "appointment_status_required", "missing_information", "unsupported_request"] },
  },
  required: ["action", "toolName", "answerDraft", "clarificationQuestion", "confidence", "reasonCode"],
} as const;

export type N8nAgentShadowDecisionInput = z.infer<typeof N8nAgentShadowDecisionInputSchema>;
export type N8nAgentShadowDecision = z.infer<typeof N8nAgentShadowDecisionSchema>;
