import { recordN8nAgentBookingCancellationDecision } from "./N8nAgentBookingCancellationState.service";

export type BookingCancellationDecisionRoutingInput = { companyId: string; whatsappAccountId: string; senderPhoneE164: string; text: string; correlationId: string };
type Dependencies = { recordDecision: typeof recordN8nAgentBookingCancellationDecision };
const defaults: Dependencies = { recordDecision: recordN8nAgentBookingCancellationDecision };

export function isN8nAgentBookingCancellationDecisionRoutingEnabled() {
  return process.env.N8N_AGENT_BOOKING_CANCELLATION_DECISION_ROUTING_ENABLED === "true";
}

export async function routeN8nAgentBookingCancellationDecision(input: BookingCancellationDecisionRoutingInput, dependencies: Dependencies = defaults) {
  if (!isN8nAgentBookingCancellationDecisionRoutingEnabled()) return { handled: false as const, reason: "disabled" as const };
  return dependencies.recordDecision(input);
}
