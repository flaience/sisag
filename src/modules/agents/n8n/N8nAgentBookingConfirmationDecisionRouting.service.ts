import { recordN8nAgentBookingConfirmationDecision } from "./N8nAgentBookingConfirmationState.service";

export type BookingConfirmationDecisionRoutingInput = {
  companyId: string;
  whatsappAccountId: string;
  senderPhoneE164: string;
  text: string;
};

type Dependencies = {
  recordDecision: typeof recordN8nAgentBookingConfirmationDecision;
};

export function isN8nAgentBookingConfirmationDecisionRoutingEnabled() {
  return process.env.N8N_AGENT_BOOKING_CONFIRMATION_DECISION_ROUTING_ENABLED === "true";
}

export async function routeN8nAgentBookingConfirmationDecision(
  input: BookingConfirmationDecisionRoutingInput,
  dependencies: Dependencies = { recordDecision: recordN8nAgentBookingConfirmationDecision },
) {
  if (!isN8nAgentBookingConfirmationDecisionRoutingEnabled()) {
    return { handled: false as const, reason: "disabled" as const };
  }
  return dependencies.recordDecision(input);
}
