import { recordN8nAgentBookingCancellationDecision } from "./N8nAgentBookingCancellationState.service";
import { executePersistedN8nAgentBookingCancellation } from "./N8nAgentBookingCancellationExecutionPersistence.service";

export type BookingCancellationDecisionRoutingInput = { companyId: string; whatsappAccountId: string; senderPhoneE164: string; text: string; correlationId: string };
type Dependencies = { recordDecision: typeof recordN8nAgentBookingCancellationDecision; executeConfirmed?: typeof executePersistedN8nAgentBookingCancellation };

export function isN8nAgentBookingCancellationDecisionRoutingEnabled() {
  return process.env.N8N_AGENT_BOOKING_CANCELLATION_DECISION_ROUTING_ENABLED === "true";
}

export async function routeN8nAgentBookingCancellationDecision(input: BookingCancellationDecisionRoutingInput, dependencies: Dependencies = { recordDecision: recordN8nAgentBookingCancellationDecision }) {
  if (!isN8nAgentBookingCancellationDecisionRoutingEnabled()) return { handled: false as const, reason: "disabled" as const };
  const decision = await dependencies.recordDecision(input);
  if (decision.handled && decision.decision === "confirm" && process.env.N8N_AGENT_BOOKING_CANCELLATION_EXECUTION_ENABLED === "true") {
    const executeConfirmed = dependencies.executeConfirmed ?? executePersistedN8nAgentBookingCancellation;
    const execution = await executeConfirmed({ stateId: decision.stateId, companyId: input.companyId, whatsappAccountId: input.whatsappAccountId, senderPhoneE164: input.senderPhoneE164, correlationId: input.correlationId });
    return { ...decision, execution };
  }
  return decision;
}
