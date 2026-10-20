import type { N8nAgentShadowDecision } from "./N8nAgentShadowDecision.schema";
import { isExplicitN8nAgentBookingReschedulingIntent } from "./N8nAgentBookingReschedulingProposal";

export function groundN8nAgentBookingReschedulingDecision(text: string, receivedAt: Date, decision: N8nAgentShadowDecision): N8nAgentShadowDecision {
  if (!isExplicitN8nAgentBookingReschedulingIntent(text)) return decision;
  const dateFrom = new Date(receivedAt);
  const dateTo = new Date(dateFrom.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    action: "request_read_only_tool",
    toolName: "scheduling.prepare_rescheduling",
    toolArguments: { dateFrom: dateFrom.toISOString(), dateTo: dateTo.toISOString(), limit: 20 },
    answerDraft: null,
    clarificationQuestion: null,
    confidence: 1,
    reasonCode: "rescheduling_required",
  };
}
