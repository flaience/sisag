import type { N8nAgentShadowAnswerCandidate, N8nAgentShadowDecisionMetadata, N8nAgentShadowToolObservation } from "./N8nAgentShadowMirrorResponse.schema";

export function createN8nAgentDirectClarificationCandidate(input: { decision?: N8nAgentShadowDecisionMetadata | null; toolObservation?: N8nAgentShadowToolObservation | null }): N8nAgentShadowAnswerCandidate | null {
  const eligible = input.decision?.action === "clarify"
    && input.decision.toolName === null
    && input.decision.reasonCode === "availability_required"
    && input.toolObservation?.requested === false
    && input.toolObservation.status === "skipped"
    && input.toolObservation.errorCode === null;
  if (!eligible) return null;
  return { kind: "availability", status: "clarify", text: "Para qual serviço ou profissional você deseja consultar os horários?", slotCount: 0, source: "shadow_policy" };
}
