import type { N8nAgentShadowDecision } from "./N8nAgentShadowDecision.schema";
import { isExplicitN8nAgentBookingCancellationIntent } from "./N8nAgentBookingCancellationProposal";

export function groundN8nAgentBookingCancellationDecision(text: string, decision: N8nAgentShadowDecision): N8nAgentShadowDecision {
  if (!isExplicitN8nAgentBookingCancellationIntent(text)) return decision;
  return {
    action: "request_read_only_tool",
    toolName: "scheduling.explain_appointment_status",
    toolArguments: { appointmentId: null },
    answerDraft: null,
    clarificationQuestion: null,
    confidence: 1,
    reasonCode: "appointment_status_required",
  };
}
