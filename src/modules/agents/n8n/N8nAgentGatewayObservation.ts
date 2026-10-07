import type { N8nAgentReadOnlyGatewayInput } from "./N8nAgentReadOnlyGateway.schema";

type GatewayResult = {
  ok: boolean;
  error?: string;
  policyVersion?: string;
  evidence?: Array<{ documentId: string; version: number; contentHash: string }>;
};

export function createN8nAgentGatewayObservation(input: N8nAgentReadOnlyGatewayInput, result: GatewayResult, observedAt = new Date()) {
  return {
    event: "n8n_agent_read_only_gateway",
    mode: "shadow",
    companyId: input.request.trustedContext.companyId,
    correlationId: input.request.trustedContext.correlationId,
    toolName: input.toolCall.name,
    ok: result.ok,
    errorCode: result.ok ? null : result.error ?? "unknown_error",
    policyVersion: result.policyVersion ?? input.request.policyVersion,
    evidence: (result.evidence ?? []).map(({ documentId, version, contentHash }) => ({ documentId, version, contentHash })),
    observedAt: observedAt.toISOString(),
  };
}
