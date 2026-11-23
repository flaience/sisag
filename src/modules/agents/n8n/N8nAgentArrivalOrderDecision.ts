import type { N8nAgentShadowDecision } from "./N8nAgentShadowDecision.schema";
import { parseN8nAgentArrivalOrderRequest } from "./N8nAgentArrivalOrderIntent";

function localDate(receivedAt: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(receivedAt);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return value.year + "-" + value.month + "-" + value.day;
}

export function groundN8nAgentArrivalOrderDecision(message: string, receivedAt: Date, timeZone: string, fallback: N8nAgentShadowDecision): N8nAgentShadowDecision {
  const request = parseN8nAgentArrivalOrderRequest(message, localDate(receivedAt, timeZone));
  if (!request) return fallback;
  return { action: "request_read_only_tool", toolName: "scheduling.list_arrival_periods", toolArguments: request, answerDraft: null, clarificationQuestion: null, confidence: 1, reasonCode: "arrival_order_availability_required" };
}
