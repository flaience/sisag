import { recordN8nAgentBookingReschedulingDecision } from "./N8nAgentBookingReschedulingState.service";
import { executePersistedN8nAgentBookingRescheduling } from "./N8nAgentBookingReschedulingExecutionPersistence.service";
export type BookingReschedulingDecisionRoutingInput = { companyId: string; whatsappAccountId: string; senderPhoneE164: string; text: string; correlationId: string };
type Dependencies = { recordDecision: typeof recordN8nAgentBookingReschedulingDecision; executeConfirmed?: typeof executePersistedN8nAgentBookingRescheduling };
export const isN8nAgentBookingReschedulingDecisionRoutingEnabled = () => process.env.N8N_AGENT_BOOKING_RESCHEDULING_DECISION_ROUTING_ENABLED === "true";
export async function routeN8nAgentBookingReschedulingDecision(input: BookingReschedulingDecisionRoutingInput, dependencies: Dependencies = { recordDecision: recordN8nAgentBookingReschedulingDecision }) {
  if (!isN8nAgentBookingReschedulingDecisionRoutingEnabled()) return { handled: false as const, reason: "disabled" as const };
  const decision = await dependencies.recordDecision(input);
  if (decision.handled && decision.decision === "confirm" && process.env.N8N_AGENT_BOOKING_RESCHEDULING_EXECUTION_ENABLED === "true") {
    const executeConfirmed = dependencies.executeConfirmed ?? executePersistedN8nAgentBookingRescheduling;
    const execution = await executeConfirmed({ stateId: decision.stateId, companyId: input.companyId, whatsappAccountId: input.whatsappAccountId, senderPhoneE164: input.senderPhoneE164, correlationId: input.correlationId });
    return { ...decision, execution };
  }
  return decision;
}
