import type { N8nAgentChannelIngressMessage } from "./N8nAgentChannelIngress";
import { resolveN8nAgentConversationContext } from "./N8nAgentConversationContext.service";
import { mirrorN8nAgentShadowMessage } from "./N8nAgentShadowMirror.service";
import { classifyN8nAgentShadowMirrorResult, N8nAgentShadowMirrorObservationService } from "./N8nAgentShadowMirrorObservation.service";

type Dependencies = {
  resolveContext: typeof resolveN8nAgentConversationContext;
  mirror: typeof mirrorN8nAgentShadowMessage;
  record: typeof N8nAgentShadowMirrorObservationService.record;
  clock: () => number;
};

const defaultDependencies: Dependencies = {
  resolveContext: resolveN8nAgentConversationContext,
  mirror: mirrorN8nAgentShadowMessage,
  record: N8nAgentShadowMirrorObservationService.record,
  clock: () => Date.now(),
};

export async function executeN8nAgentSharedDecision(
  message: N8nAgentChannelIngressMessage,
  dependencies: Dependencies = defaultDependencies,
) {
  const startedAt = dependencies.clock();
  const input = message.mirrorInput;
  const contextual = await dependencies.resolveContext(input).catch(() => ({ text: input.text, continued: false as const }));
  const result = await dependencies.mirror({ ...input, text: contextual.text });
  await dependencies.record({
    companyId: input.companyId,
    correlationId: input.providerMessageId,
    status: classifyN8nAgentShadowMirrorResult(result),
    durationMs: Math.max(0, dependencies.clock() - startedAt),
    decision: "decision" in result ? result.decision : null,
    execution: "execution" in result ? result.execution : null,
    toolObservation: "toolObservation" in result ? result.toolObservation : null,
    contextContinued: contextual.continued,
  }).catch(() => undefined);
  return { result, contextContinued: contextual.continued, source: message.source };
}
