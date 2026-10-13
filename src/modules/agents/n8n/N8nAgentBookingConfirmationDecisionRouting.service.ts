import { recordN8nAgentBookingConfirmationDecision } from "./N8nAgentBookingConfirmationState.service";
import { executePersistedN8nAgentBookingConfirmation } from "./N8nAgentBookingConfirmationExecutionPersistence.service";

export type BookingConfirmationDecisionRoutingInput = {
  companyId: string;
  whatsappAccountId: string;
  senderPhoneE164: string;
  text: string;
  correlationId: string;
};

type Dependencies = {
  recordDecision: typeof recordN8nAgentBookingConfirmationDecision;
  executeConfirmed?: typeof executePersistedN8nAgentBookingConfirmation;
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
  const decision = await dependencies.recordDecision(input);
  if (decision.handled && decision.decision === "confirm" && process.env.N8N_AGENT_BOOKING_CONFIRMATION_EXECUTION_ENABLED === "true") {
    const executeConfirmed = dependencies.executeConfirmed ?? executePersistedN8nAgentBookingConfirmation;
    const execution = await executeConfirmed({ stateId: decision.stateId, companyId: input.companyId, senderPhoneE164: input.senderPhoneE164, correlationId: input.correlationId });
    return { ...decision, execution };
  }
  return decision;
}
