import { persistN8nAgentBookingReschedulingProposalAndPublish } from "./N8nAgentBookingReschedulingState.service";
import type { N8nAgentShadowBookingReschedulingProposal, N8nAgentShadowDecisionMetadata, N8nAgentShadowToolObservation } from "./N8nAgentShadowMirrorResponse.schema";

type Input = { companyId: string; whatsappAccountId: string; toPhone: string; correlationId: string; decision?: N8nAgentShadowDecisionMetadata | null; toolObservation?: N8nAgentShadowToolObservation | null; proposal?: N8nAgentShadowBookingReschedulingProposal | null };
type Dependencies = { persistAndPublish: typeof persistN8nAgentBookingReschedulingProposalAndPublish };
const defaults: Dependencies = { persistAndPublish: persistN8nAgentBookingReschedulingProposalAndPublish };
export const isN8nAgentBookingReschedulingProposalRoutingEnabled = () => process.env.N8N_AGENT_BOOKING_RESCHEDULING_PROPOSAL_ROUTING_ENABLED === "true";

function eligible(input: Input) {
  const proposal = input.proposal;
  if (input.decision?.action !== "request_read_only_tool" || input.decision.toolName !== "scheduling.prepare_rescheduling" || input.decision.reasonCode !== "rescheduling_required") return false;
  if (input.toolObservation?.requested !== true || input.toolObservation.status !== "succeeded" || input.toolObservation.errorCode !== null) return false;
  if (proposal?.kind !== "booking_rescheduling" || proposal.status !== "awaiting_explicit_confirmation" || proposal.dispatchAllowed !== true || proposal.reschedulingExecutionAllowed !== false) return false;
  if (proposal.draft.appointmentId !== proposal.appointment.appointmentId || proposal.draft.serviceId !== proposal.appointment.serviceId || proposal.draft.serviceId !== proposal.selectedSlot.serviceId || proposal.draft.newStartTime !== proposal.selectedSlot.startsAt) return false;
  if (!["PENDING", "CONFIRMED"].includes(proposal.appointment.status)) return false;
  const currentStart = new Date(proposal.appointment.startsAt);
  const newStart = new Date(proposal.selectedSlot.startsAt);
  const newEnd = new Date(proposal.selectedSlot.endsAt);
  if (![currentStart, newStart, newEnd].every(value => Number.isFinite(value.getTime())) || currentStart <= new Date() || newStart <= new Date() || newEnd <= newStart || currentStart.getTime() === newStart.getTime()) return false;
  return proposal.text.includes("SIM") && proposal.text.includes("NÃO") && proposal.text.length <= 500;
}

export async function routeN8nAgentBookingReschedulingProposal(input: Input, dependencies: Dependencies = defaults) {
  if (!isN8nAgentBookingReschedulingProposalRoutingEnabled()) return { handled: false as const, reason: "disabled" as const };
  if (!eligible(input)) return { handled: false as const, reason: "proposal_not_eligible" as const };
  try {
    await dependencies.persistAndPublish({ companyId: input.companyId, whatsappAccountId: input.whatsappAccountId, toPhone: input.toPhone, correlationId: input.correlationId, proposal: input.proposal! });
    return { handled: true as const };
  } catch {
    return { handled: false as const, reason: "proposal_publish_failed" as const };
  }
}
