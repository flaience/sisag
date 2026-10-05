import { validateN8nAgentEvidenceTenant } from "./N8nAgentFoundation.contract";
import { N8nAgentReadOnlyGatewaySchema, type N8nAgentReadOnlyGatewayInput } from "./N8nAgentReadOnlyGateway.schema";
import { evaluateN8nAgentTool } from "./N8nAgentToolPolicy";

export type N8nAgentReadOnlyGatewayDependencies = {
  execute: (input: { toolCall: N8nAgentReadOnlyGatewayInput["toolCall"]; companyId: string; correlationId: string }) => Promise<unknown>;
};

export async function executeN8nAgentReadOnlyGateway(raw: unknown, dependencies: N8nAgentReadOnlyGatewayDependencies) {
  const parsed = N8nAgentReadOnlyGatewaySchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "invalid_gateway_request" as const };
  const input = parsed.data;
  const companyId = input.request.trustedContext.companyId;
  if (!validateN8nAgentEvidenceTenant(companyId, input.evidence)) return { ok: false as const, error: "invalid_evidence_scope" as const };
  const decision = evaluateN8nAgentTool(input.toolCall.name);
  if (!decision.allowed || decision.execution !== "read_only") return { ok: false as const, error: "tool_not_allowed" as const };
  try {
    const data = await dependencies.execute({ toolCall: input.toolCall, companyId, correlationId: input.request.trustedContext.correlationId });
    return { ok: true as const, data, evidence: input.evidence.map(({ documentId, version, contentHash, title, excerpt }) => ({ documentId, version, contentHash, title, excerpt })), policyVersion: input.request.policyVersion };
  } catch {
    return { ok: false as const, error: "read_only_tool_failed" as const };
  }
}
