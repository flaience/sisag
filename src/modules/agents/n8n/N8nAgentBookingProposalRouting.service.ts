import crypto from "node:crypto";
import { OutboxPublisher } from "@/infra/outbox/OutboxPublisher";
import { normalizePhoneE164 } from "@/modules/clients/phone/normalizePhone";
import type { N8nAgentShadowBookingConfirmationProposal, N8nAgentShadowDecisionMetadata, N8nAgentShadowToolObservation } from "./N8nAgentShadowMirrorResponse.schema";

type Input = { companyId: string; toPhone: string; correlationId: string; decision?: N8nAgentShadowDecisionMetadata | null; toolObservation?: N8nAgentShadowToolObservation | null; proposal?: N8nAgentShadowBookingConfirmationProposal | null };
type Dependencies = { publish: typeof OutboxPublisher.publish };
const defaults: Dependencies = { publish: OutboxPublisher.publish };
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
    await dependencies.publish({
      aggregateType: "whatsapp_message", aggregateId: crypto.randomUUID(), eventType: "whatsapp.send.requested", status: "pending",
      dedupeKey: `wa_send:${input.correlationId}`,
      payload: { companyId: input.companyId, toPhone: normalizePhoneE164(input.toPhone), text: proposal.text, clientId: null, correlationId: input.correlationId, meta: { source: "n8n_agent_booking_proposal_v1", emittedAt: new Date().toISOString() } },
    });
    return { handled: true as const };
  } catch { return { handled: false as const, reason: "proposal_publish_failed" as const }; }
}
