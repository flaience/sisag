import type { N8nAgentShadowAnswerCandidate, N8nAgentShadowDecisionMetadata, N8nAgentShadowToolObservation } from "./N8nAgentShadowMirrorResponse.schema";

const sanitizeQuestion = (value: unknown) => typeof value === "string"
  ? value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 300)
  : "";

export function createN8nAgentDirectClarificationCandidate(input: { decision?: N8nAgentShadowDecisionMetadata | null; toolObservation?: N8nAgentShadowToolObservation | null }): N8nAgentShadowAnswerCandidate | null {
  const eligible = input.decision?.action === "clarify"
    && input.decision.toolName === null
    && ["availability_required", "missing_information"].includes(input.decision.reasonCode)
    && input.toolObservation?.requested === false
    && input.toolObservation.status === "skipped"
    && input.toolObservation.errorCode === null;
  if (!eligible) return null;
  const text = input.decision.reasonCode === "availability_required"
    ? "Para qual serviço ou profissional você deseja consultar os horários?"
    : sanitizeQuestion(input.decision.clarificationQuestion);
  if (!text) return null;
  return { kind: "availability", status: "clarify", text, slotCount: 0, source: "shadow_policy" };
}
