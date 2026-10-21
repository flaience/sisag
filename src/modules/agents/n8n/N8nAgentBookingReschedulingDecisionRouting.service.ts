import { recordN8nAgentBookingReschedulingDecision } from "./N8nAgentBookingReschedulingState.service";
export type BookingReschedulingDecisionRoutingInput = { companyId: string; whatsappAccountId: string; senderPhoneE164: string; text: string; correlationId: string };
type Dependencies = { recordDecision: typeof recordN8nAgentBookingReschedulingDecision };
export const isN8nAgentBookingReschedulingDecisionRoutingEnabled = () => process.env.N8N_AGENT_BOOKING_RESCHEDULING_DECISION_ROUTING_ENABLED === "true";
export async function routeN8nAgentBookingReschedulingDecision(input: BookingReschedulingDecisionRoutingInput, dependencies: Dependencies = { recordDecision: recordN8nAgentBookingReschedulingDecision }) {
  if (!isN8nAgentBookingReschedulingDecisionRoutingEnabled()) return { handled: false as const, reason: "disabled" as const };
  return dependencies.recordDecision(input);
}
