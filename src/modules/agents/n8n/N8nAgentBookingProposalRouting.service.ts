import { persistN8nAgentBookingProposalAndPublish } from "./N8nAgentBookingConfirmationState.service";
import type { N8nAgentShadowBookingConfirmationProposal, N8nAgentShadowDecisionMetadata, N8nAgentShadowToolObservation } from "./N8nAgentShadowMirrorResponse.schema";

type Input = { companyId: string; whatsappAccountId: string; toPhone: string; correlationId: string; decision?: N8nAgentShadowDecisionMetadata | null; toolObservation?: N8nAgentShadowToolObservation | null; proposal?: N8nAgentShadowBookingConfirmationProposal | null };
type Dependencies = { persistAndPublish: typeof persistN8nAgentBookingProposalAndPublish };
const defaults: Dependencies = { persistAndPublish: persistN8nAgentBookingProposalAndPublish };
export const isN8nAgentBookingProposalRoutingEnabled = () => process.env.N8N_AGENT_BOOKING_PROPOSAL_ROUTING_ENABLED === "true";

export async function routeN8nAgentBookingProposal(input: Input, dependencies: Dependencies = defaults) {
  if (!isN8nAgentBookingProposalRoutingEnabled()) return { handled: false as const, reason: "disabled" as const };
  const proposal = input.proposal;
  const eligible = input.decision?.action === "request_read_only_tool"
    && input.decision.toolName === "scheduling.find_available_slots"
    && input.toolObservation?.requested === true
    && input.toolObservation.status === "succeeded"
    && input.toolObservation.errorCode === null
    && proposal?.kind === "booking_confirmation"
    && proposal.status === "awaiting_explicit_confirmation"
    && proposal.dispatchAllowed === true
    && proposal.bookingExecutionAllowed === false
    && proposal.draft.serviceId === proposal.selectedSlot.serviceId
    && proposal.draft.startTime === proposal.selectedSlot.startsAt
    && proposal.text.includes("SIM") && proposal.text.includes("NÃO")
    && proposal.text.length <= 500;
  if (!eligible) return { handled: false as const, reason: "proposal_not_eligible" as const };
  try {
    await dependencies.persistAndPublish({ companyId: input.companyId, whatsappAccountId: input.whatsappAccountId, toPhone: input.toPhone, correlationId: input.correlationId, proposal });
    return { handled: true as const };
  } catch { return { handled: false as const, reason: "proposal_publish_failed" as const }; }
}
