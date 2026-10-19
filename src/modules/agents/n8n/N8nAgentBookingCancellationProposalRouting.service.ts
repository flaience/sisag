import crypto from "node:crypto";
import { OutboxPublisher } from "@/infra/outbox/OutboxPublisher";
import { normalizePhoneE164 } from "@/modules/clients/phone/normalizePhone";
import { persistN8nAgentBookingCancellationProposalAndPublish } from "./N8nAgentBookingCancellationState.service";
import type { N8nAgentShadowBookingCancellationProposal, N8nAgentShadowDecisionMetadata, N8nAgentShadowToolObservation } from "./N8nAgentShadowMirrorResponse.schema";

type Input = { companyId: string; whatsappAccountId: string; toPhone: string; correlationId: string; decision?: N8nAgentShadowDecisionMetadata | null; toolObservation?: N8nAgentShadowToolObservation | null; proposal?: N8nAgentShadowBookingCancellationProposal | null };
type Observation = { event: "n8n_agent_booking_cancellation_proposal_routing"; correlationId: string; stage: "eligibility" | "persistence" | "fallback"; code: string };
type Dependencies = { persistAndPublish: typeof persistN8nAgentBookingCancellationProposalAndPublish; publishFallback: typeof OutboxPublisher.publish; observe: (observation: Observation) => void };
const defaults: Dependencies = { persistAndPublish: persistN8nAgentBookingCancellationProposalAndPublish, publishFallback: OutboxPublisher.publish, observe: observation => console.warn(observation) };
export const isN8nAgentBookingCancellationProposalRoutingEnabled = () => process.env.N8N_AGENT_BOOKING_CANCELLATION_PROPOSAL_ROUTING_ENABLED === "true";

function eligibilityCode(input: Input) {
  const proposal = input.proposal;
  if (input.decision?.action !== "request_read_only_tool" || input.decision.toolName !== "scheduling.explain_appointment_status" || input.decision.reasonCode !== "appointment_status_required") return "decision_contract";
  if (input.toolObservation?.requested !== true || input.toolObservation.status !== "succeeded" || input.toolObservation.errorCode !== null) return "tool_observation";
  if (proposal?.kind !== "booking_cancellation" || proposal.status !== "awaiting_explicit_confirmation" || proposal.dispatchAllowed !== true || proposal.cancellationExecutionAllowed !== false) return "proposal_contract";
  if (proposal.draft.appointmentId !== proposal.appointment.appointmentId) return "appointment_mismatch";
  if (!["PENDING", "CONFIRMED"].includes(proposal.appointment.status)) return "appointment_state";
  const startsAt = new Date(proposal.appointment.startsAt);
  if (!Number.isFinite(startsAt.getTime()) || startsAt <= new Date()) return "appointment_time";
  if (!proposal.text.includes("SIM") || !proposal.text.includes("NÃO") || proposal.text.length > 500) return "confirmation_text";
  return null;
}

function safeErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) { const code = String(error.code); if (/^[A-Za-z0-9_]{1,64}$/.test(code)) return code; }
  if (error instanceof Error && /^[A-Za-z0-9_]{1,64}$/.test(error.name)) return error.name;
  return "unknown_error";
}

async function publishSafeFallback(input: Input, dependencies: Dependencies) {
  try {
    await dependencies.publishFallback({ aggregateType: "whatsapp_message", aggregateId: crypto.randomUUID(), eventType: "whatsapp.send.requested", status: "pending", dedupeKey: "wa_send:cancellation-routing-error:" + input.correlationId, payload: { companyId: input.companyId, toPhone: normalizePhoneE164(input.toPhone), text: "Não consegui preparar o cancelamento agora. Seu agendamento não foi alterado. Tente novamente em alguns instantes.", clientId: null, correlationId: input.correlationId, meta: { source: "n8n_agent_booking_cancellation_routing_error_v1", emittedAt: new Date().toISOString() } } });
    return true;
  } catch (error) {
    dependencies.observe({ event: "n8n_agent_booking_cancellation_proposal_routing", correlationId: input.correlationId, stage: "fallback", code: safeErrorCode(error) });
    return false;
  }
}

export async function routeN8nAgentBookingCancellationProposal(input: Input, supplied: Partial<Dependencies> = {}) {
  const dependencies = { ...defaults, ...supplied };
  if (!isN8nAgentBookingCancellationProposalRoutingEnabled()) return { handled: false as const, reason: "disabled" as const };
  const ineligible = eligibilityCode(input);
  if (ineligible) {
    dependencies.observe({ event: "n8n_agent_booking_cancellation_proposal_routing", correlationId: input.correlationId, stage: "eligibility", code: ineligible });
    const handled = await publishSafeFallback(input, dependencies);
    return handled ? { handled: true as const, reason: "safe_fallback" as const } : { handled: false as const, reason: "proposal_not_eligible" as const };
  }
  try {
    await dependencies.persistAndPublish({ companyId: input.companyId, whatsappAccountId: input.whatsappAccountId, toPhone: input.toPhone, correlationId: input.correlationId, proposal: input.proposal! });
    return { handled: true as const };
  } catch (error) {
    dependencies.observe({ event: "n8n_agent_booking_cancellation_proposal_routing", correlationId: input.correlationId, stage: "persistence", code: safeErrorCode(error) });
    const handled = await publishSafeFallback(input, dependencies);
    return handled ? { handled: true as const, reason: "safe_fallback" as const } : { handled: false as const, reason: "proposal_publish_failed" as const };
  }
}
