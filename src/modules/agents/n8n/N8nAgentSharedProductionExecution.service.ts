import type { N8nAgentChannelIngressMessage } from "./N8nAgentChannelIngress";
import { executeN8nAgentSharedDecision } from "./N8nAgentSharedDecisionExecutor.service";
import { isN8nAgentShadowMirrorEnabled } from "./N8nAgentShadowMirror.service";
import { isN8nAgentSharedResultRoutingEnabled, routeN8nAgentSharedResult } from "./N8nAgentSharedResultRouter.service";

type Fallback = (message: N8nAgentChannelIngressMessage) => Promise<{ ok: boolean }>;
type Dependencies = {
  mirrorEnabled: typeof isN8nAgentShadowMirrorEnabled;
  routingEnabled: typeof isN8nAgentSharedResultRoutingEnabled;
  executeDecision: typeof executeN8nAgentSharedDecision;
  routeResult: typeof routeN8nAgentSharedResult;
};

const defaults: Dependencies = {
  mirrorEnabled: isN8nAgentShadowMirrorEnabled,
  routingEnabled: isN8nAgentSharedResultRoutingEnabled,
  executeDecision: executeN8nAgentSharedDecision,
  routeResult: routeN8nAgentSharedResult,
};

export async function executeN8nAgentSharedProductionMessage(
  message: N8nAgentChannelIngressMessage,
  fallback: Fallback,
  dependencies: Dependencies = defaults,
) {
  if (dependencies.mirrorEnabled() && dependencies.routingEnabled()) {
    try {
      const executed = await dependencies.executeDecision(message);
      const input = message.mirrorInput;
      const routed = await dependencies.routeResult({
        companyId: input.companyId,
        whatsappAccountId: input.whatsappAccountId,
        toPhone: input.senderPhoneE164,
        correlationId: input.providerMessageId,
        result: executed.result,
      });
      if (routed.handled) return { ok: true as const, handledBy: "n8n_agent" as const };
    } catch {}
  }
  const result = await fallback(message);
  return { ...result, handledBy: "fallback" as const };
}
