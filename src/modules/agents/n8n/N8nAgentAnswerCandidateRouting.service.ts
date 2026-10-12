import crypto from "node:crypto";
import { normalizePhoneE164 } from "@/modules/clients/phone/normalizePhone";
import { OutboxPublisher } from "@/infra/outbox/OutboxPublisher";
import type { N8nAgentShadowAnswerCandidate, N8nAgentShadowDecisionMetadata, N8nAgentShadowToolObservation } from "./N8nAgentShadowMirrorResponse.schema";

type RoutingInput = { companyId: string; toPhone: string; correlationId: string; decision?: N8nAgentShadowDecisionMetadata | null; toolObservation?: N8nAgentShadowToolObservation | null; answerCandidate?: N8nAgentShadowAnswerCandidate | null };
type Dependencies = { publish: typeof OutboxPublisher.publish };
const defaults: Dependencies = { publish: OutboxPublisher.publish };
export const isN8nAgentAnswerCandidateRoutingEnabled = () => process.env.N8N_AGENT_ANSWER_CANDIDATE_ROUTING_ENABLED === "true";

export async function routeN8nAgentAnswerCandidate(input: RoutingInput, dependencies: Dependencies = defaults) {
  if (!isN8nAgentAnswerCandidateRoutingEnabled()) return { handled: false as const, reason: "disabled" as const };
  const candidate = input.answerCandidate;
  const eligible = input.decision?.action === "request_read_only_tool"
    && input.decision.toolName === "scheduling.find_available_slots"
    && input.toolObservation?.errorCode === "SCHEDULING_RESOURCE_NOT_FOUND"
    && candidate?.kind === "availability" && candidate.status === "clarify"
    && candidate.source === "read_only_tool" && candidate.text.length > 0 && candidate.text.length <= 500;
  if (!eligible) return { handled: false as const, reason: "candidate_not_eligible" as const };
  try {
    await dependencies.publish({
      aggregateType: "whatsapp_message", aggregateId: crypto.randomUUID(), eventType: "whatsapp.send.requested", status: "pending",
      dedupeKey: `wa_send:${input.correlationId}`,
      payload: { companyId: input.companyId, toPhone: normalizePhoneE164(input.toPhone), text: candidate.text, clientId: null, correlationId: input.correlationId, meta: { source: "n8n_agent_candidate_v1", emittedAt: new Date().toISOString() } },
    });
    return { handled: true as const };
  } catch {
    return { handled: false as const, reason: "candidate_publish_failed" as const };
  }
}
