import { persistN8nAgentBookingCancellationProposalAndPublish } from "./N8nAgentBookingCancellationState.service";
import type { N8nAgentShadowBookingCancellationProposal, N8nAgentShadowDecisionMetadata, N8nAgentShadowToolObservation } from "./N8nAgentShadowMirrorResponse.schema";

type Input = { companyId: string; whatsappAccountId: string; toPhone: string; correlationId: string; decision?: N8nAgentShadowDecisionMetadata | null; toolObservation?: N8nAgentShadowToolObservation | null; proposal?: N8nAgentShadowBookingCancellationProposal | null };
type Dependencies = { persistAndPublish: typeof persistN8nAgentBookingCancellationProposalAndPublish };
const defaults: Dependencies = { persistAndPublish: persistN8nAgentBookingCancellationProposalAndPublish };
export const isN8nAgentBookingCancellationProposalRoutingEnabled = () => process.env.N8N_AGENT_BOOKING_CANCELLATION_PROPOSAL_ROUTING_ENABLED === "true";

export async function routeN8nAgentBookingCancellationProposal(input: Input, dependencies: Dependencies = defaults) {
  if (!isN8nAgentBookingCancellationProposalRoutingEnabled()) return { handled: false as const, reason: "disabled" as const };
  const proposal = input.proposal;
  const startsAt = proposal ? new Date(proposal.appointment.startsAt) : null;
  const eligible = input.decision?.action === "request_read_only_tool" && input.decision.toolName === "scheduling.explain_appointment_status" && input.decision.reasonCode === "appointment_status_required"
    && input.toolObservation?.requested === true && input.toolObservation.status === "succeeded" && input.toolObservation.errorCode === null
    && proposal?.kind === "booking_cancellation" && proposal.status === "awaiting_explicit_confirmation" && proposal.dispatchAllowed === true && proposal.cancellationExecutionAllowed === false
    && proposal.draft.appointmentId === proposal.appointment.appointmentId && ["PENDING", "CONFIRMED"].includes(proposal.appointment.status)
    && startsAt !== null && Number.isFinite(startsAt.getTime()) && startsAt > new Date() && proposal.text.includes("SIM") && proposal.text.includes("NÃO") && proposal.text.length <= 500;
  if (!eligible) return { handled: false as const, reason: "proposal_not_eligible" as const };
  try {
    await dependencies.persistAndPublish({ companyId: input.companyId, whatsappAccountId: input.whatsappAccountId, toPhone: input.toPhone, correlationId: input.correlationId, proposal });
    return { handled: true as const };
  } catch { return { handled: false as const, reason: "proposal_publish_failed" as const }; }
}
