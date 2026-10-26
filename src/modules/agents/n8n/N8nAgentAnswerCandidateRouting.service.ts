import crypto from "node:crypto";
import { normalizePhoneE164 } from "@/modules/clients/phone/normalizePhone";
import { OutboxPublisher } from "@/infra/outbox/OutboxPublisher";
import type { N8nAgentShadowAnswerCandidate, N8nAgentShadowDecisionMetadata, N8nAgentShadowToolObservation } from "./N8nAgentShadowMirrorResponse.schema";

type RoutingInput = { companyId: string; toPhone: string; correlationId: string; decision?: N8nAgentShadowDecisionMetadata | null; toolObservation?: N8nAgentShadowToolObservation | null; answerCandidate?: N8nAgentShadowAnswerCandidate | null };
type Observation = { event: "n8n_agent_upcoming_appointments_routing"; correlationId: string; stage: "eligibility" | "delivery"; code: string };
type Dependencies = { publish: typeof OutboxPublisher.publish; observe: (observation: Observation) => void };
const defaults: Dependencies = { publish: OutboxPublisher.publish, observe: observation => console.warn(observation) };
const APPOINTMENT_STATUSES = new Set(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]);
export const isN8nAgentAnswerCandidateRoutingEnabled = () => process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED === "true";
export const isN8nAgentAppointmentStatusRoutingEnabled = () => process.env.N8N_AGENT_APPOINTMENT_STATUS_ROUTING_ENABLED === "true";
export const isN8nAgentUpcomingAppointmentsRoutingEnabled = () => process.env.N8N_AGENT_UPCOMING_APPOINTMENTS_ROUTING_ENABLED === "true";

function availabilityEligible(input: RoutingInput, candidate: N8nAgentShadowAnswerCandidate) {
  if (candidate.kind !== "availability") return false;
  const safeOutcome = (input.toolObservation?.requested === true
      && input.toolObservation.status === "succeeded"
      && input.toolObservation.errorCode === null
      && ((candidate.status === "ready" && candidate.slotCount > 0) || (candidate.status === "empty" && candidate.slotCount === 0)))
    || (input.toolObservation?.requested === true
      && input.toolObservation.status === "failed"
      && input.toolObservation.errorCode === "SCHEDULING_RESOURCE_NOT_FOUND"
      && candidate.status === "clarify" && candidate.slotCount === 0);
  const readOnlyEligible = input.decision?.action === "request_read_only_tool"
    && input.decision.toolName === "scheduling.find_available_slots"
    && candidate.source === "read_only_tool" && safeOutcome;
  const directClarificationEligible = input.decision?.action === "clarify"
    && input.decision.toolName === null
    && input.decision.reasonCode === "availability_required"
    && input.toolObservation?.requested === false
    && input.toolObservation.status === "skipped"
    && input.toolObservation.errorCode === null
    && candidate.source === "shadow_policy" && candidate.status === "clarify" && candidate.slotCount === 0;
  return readOnlyEligible || directClarificationEligible;
}

function appointmentStatusEligible(input: RoutingInput, candidate: N8nAgentShadowAnswerCandidate) {
  if (!isN8nAgentAppointmentStatusRoutingEnabled() || candidate.kind !== "appointment_status") return false;
  if (input.decision?.action !== "request_read_only_tool" || input.decision.toolName !== "scheduling.explain_appointment_status" || input.decision.reasonCode !== "appointment_status_required" || candidate.source !== "read_only_tool" || input.toolObservation?.requested !== true) return false;
  if (candidate.status === "ready") return input.toolObservation.status === "succeeded"
    && input.toolObservation.errorCode === null
    && candidate.appointmentStatus !== null
    && APPOINTMENT_STATUSES.has(candidate.appointmentStatus)
    && candidate.startsAt !== null
    && Number.isFinite(new Date(candidate.startsAt).getTime());
  return candidate.status === "not_found"
    && input.toolObservation.status === "failed"
    && input.toolObservation.errorCode === "SCHEDULING_APPOINTMENT_NOT_FOUND"
    && candidate.appointmentStatus === null
    && candidate.startsAt === null;
}

function upcomingAppointmentsEligibilityCode(input: RoutingInput, candidate: N8nAgentShadowAnswerCandidate) {
  if (!isN8nAgentUpcomingAppointmentsRoutingEnabled()) return "disabled";
  if (candidate.kind !== "upcoming_appointments") return "candidate_kind";
  if (input.decision?.action !== "request_read_only_tool" || input.decision.toolName !== "scheduling.list_upcoming_appointments" || input.decision.reasonCode !== "upcoming_appointments_required" || candidate.source !== "read_only_tool") return "decision_contract";
  if (input.toolObservation?.requested !== true || input.toolObservation.status !== "succeeded" || input.toolObservation.errorCode !== null) return "tool_observation";
  if (candidate.status === "ready" && candidate.appointmentCount > 0 && candidate.appointmentCount <= 5) return null;
  if (candidate.status === "empty" && candidate.appointmentCount === 0) return null;
  return "candidate_contract";
}

function safeObservationCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) { const code = String(error.code); if (/^[A-Za-z0-9_]{1,64}$/.test(code)) return code; }
  if (error instanceof Error && /^[A-Za-z0-9_]{1,64}$/.test(error.name)) return error.name;
  return "unknown_error";
}

export async function routeN8nAgentAnswerCandidate(input: RoutingInput, supplied: Partial<Dependencies> = {}) {
  const dependencies = { ...defaults, ...supplied };
  if (!isN8nAgentAnswerCandidateRoutingEnabled()) return { handled: false as const, reason: "disabled" as const };
  const candidate = input.answerCandidate;
  if (!candidate) return { handled: false as const, reason: "candidate_not_eligible" as const };
  const upcomingCode = candidate.kind === "upcoming_appointments" ? upcomingAppointmentsEligibilityCode(input, candidate) : null;
  const eligible = candidate.kind === "availability" ? availabilityEligible(input, candidate) : candidate.kind === "appointment_status" ? appointmentStatusEligible(input, candidate) : upcomingCode === null;
  if (!eligible || candidate.text.length === 0 || candidate.text.length > 500) {
    if (candidate.kind === "upcoming_appointments") dependencies.observe({ event: "n8n_agent_upcoming_appointments_routing", correlationId: input.correlationId, stage: "eligibility", code: upcomingCode ?? "text_contract" });
    return { handled: false as const, reason: "candidate_not_eligible" as const };
  }
  try {
    await dependencies.publish({
      aggregateType: "whatsapp_message", aggregateId: crypto.randomUUID(), eventType: "whatsapp.send.requested", status: "pending",
      dedupeKey: "wa_send:" + input.correlationId,
      payload: { companyId: input.companyId, toPhone: normalizePhoneE164(input.toPhone), text: candidate.text, clientId: null, correlationId: input.correlationId, meta: { source: candidate.kind === "appointment_status" ? "n8n_agent_appointment_status_v1" : candidate.kind === "upcoming_appointments" ? "n8n_agent_upcoming_appointments_v1" : "n8n_agent_candidate_v1", emittedAt: new Date().toISOString() } },
    });
    if (candidate.kind === "upcoming_appointments") dependencies.observe({ event: "n8n_agent_upcoming_appointments_routing", correlationId: input.correlationId, stage: "delivery", code: "published" });
    return { handled: true as const };
  } catch (error) {
    if (candidate.kind === "upcoming_appointments") dependencies.observe({ event: "n8n_agent_upcoming_appointments_routing", correlationId: input.correlationId, stage: "delivery", code: safeObservationCode(error) });
    return { handled: false as const, reason: "candidate_publish_failed" as const };
  }
}
