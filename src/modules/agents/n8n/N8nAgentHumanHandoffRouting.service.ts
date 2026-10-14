import { isN8nAgentConversationSuspended, persistN8nAgentHumanHandoffAndPublish } from "./N8nAgentHumanHandoffState.service";
import type { N8nAgentShadowDecisionMetadata } from "./N8nAgentShadowMirrorResponse.schema";

type Input = { companyId: string; whatsappAccountId: string; toPhone: string; correlationId: string; decision?: N8nAgentShadowDecisionMetadata | null };
type Dependencies = { persistAndPublish: typeof persistN8nAgentHumanHandoffAndPublish; isSuspended: typeof isN8nAgentConversationSuspended };
const defaults: Dependencies = { persistAndPublish: persistN8nAgentHumanHandoffAndPublish, isSuspended: isN8nAgentConversationSuspended };
const HANDOFF_TEXT = "Vou encaminhar sua solicitação para atendimento humano. Enquanto isso, o assistente automático ficará pausado nesta conversa.";

export const isN8nAgentHumanHandoffRoutingEnabled = () => process.env.N8N_AGENT_HUMAN_HANDOFF_ROUTING_ENABLED === "true";

export async function shouldSuspendN8nAgentConversation(input: { companyId: string; whatsappAccountId: string; senderPhoneE164: string }, dependencies: Pick<Dependencies, "isSuspended"> = defaults) {
  if (!isN8nAgentHumanHandoffRoutingEnabled()) return false;
  return dependencies.isSuspended(input).catch(() => false);
}

export async function routeN8nAgentHumanHandoff(input: Input, dependencies: Pick<Dependencies, "persistAndPublish"> = defaults) {
  if (!isN8nAgentHumanHandoffRoutingEnabled()) return { handled: false as const, reason: "disabled" as const };
  if (!input.decision || input.decision.action !== "handoff" || input.decision.toolName !== null) return { handled: false as const, reason: "handoff_not_eligible" as const };
  try {
    const result = await dependencies.persistAndPublish({ companyId: input.companyId, whatsappAccountId: input.whatsappAccountId, toPhone: input.toPhone, correlationId: input.correlationId, reasonCode: input.decision.reasonCode, confidence: input.decision.confidence, text: HANDOFF_TEXT });
    return result.created || result.reason === "duplicate_correlation" ? { handled: true as const } : { handled: false as const, reason: "handoff_not_persisted" as const };
  } catch {
    return { handled: false as const, reason: "handoff_publish_failed" as const };
  }
}