import crypto from "node:crypto";
import { OutboxPublisher } from "@/infra/outbox/OutboxPublisher";
import { normalizePhoneE164 } from "@/modules/clients/phone/normalizePhone";
import type { N8nAgentShadowBookingReschedulingProposal, N8nAgentShadowDecisionMetadata, N8nAgentShadowToolObservation } from "./N8nAgentShadowMirrorResponse.schema";

type Input = { companyId: string; toPhone: string; correlationId: string; decision?: N8nAgentShadowDecisionMetadata | null; toolObservation?: N8nAgentShadowToolObservation | null; proposal?: N8nAgentShadowBookingReschedulingProposal | null };
type Dependencies = { publish: typeof OutboxPublisher.publish };
const defaults: Dependencies = { publish: OutboxPublisher.publish };
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
    await dependencies.publish({
      aggregateType: "whatsapp_message", aggregateId: crypto.randomUUID(), eventType: "whatsapp.send.requested", status: "pending",
      dedupeKey: "wa_send:rescheduling-proposal:" + input.correlationId,
      payload: { companyId: input.companyId, toPhone: normalizePhoneE164(input.toPhone), text: input.proposal!.text, clientId: null, correlationId: input.correlationId, meta: { source: "n8n_agent_booking_rescheduling_proposal_v1", emittedAt: new Date().toISOString() } },
    });
    return { handled: true as const };
  } catch {
    return { handled: false as const, reason: "proposal_publish_failed" as const };
  }
}
