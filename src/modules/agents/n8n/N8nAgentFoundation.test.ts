import { describe, expect, it } from "vitest";
import { N8nAgentEvidenceSchema, N8nAgentRequestSchema, validateN8nAgentEvidenceTenant } from "./N8nAgentFoundation.contract";
import { evaluateN8nAgentTool } from "./N8nAgentToolPolicy";

const companyId = "9af03377-1d22-40be-9460-dbe07b2709d5";
const request = {
  policyVersion: "n8n_agent_foundation_v1",
  trustedContext: { companyId, whatsappAccountId: "e87c8491-d1db-4b2b-939f-4fb2e95a304b", channel: "whatsapp", senderPhoneE164: "+5554991430586", correlationId: "wamid.test-123", receivedAt: "2026-10-05T15:00:00Z", timeZone: "America/Sao_Paulo" },
  message: { providerMessageId: "wamid.test-123", text: "Quero agendar amanhã" },
};

describe("n8n agent MCP and RAG foundation", () => {
  it("accepts a bounded trusted WhatsApp envelope", () => {
    expect(N8nAgentRequestSchema.safeParse(request).success).toBe(true);
    expect(N8nAgentRequestSchema.safeParse({ ...request, companyId }).success).toBe(false);
  });

  it("requires approved versioned tenant evidence", () => {
    const evidence = N8nAgentEvidenceSchema.parse({ companyId, documentId: "11111111-1111-4111-8111-111111111111", version: 1, contentHash: "a".repeat(64), status: "approved", title: "Política", excerpt: "Conteúdo aprovado" });
    expect(validateN8nAgentEvidenceTenant(companyId, [evidence])).toBe(true);
    expect(validateN8nAgentEvidenceTenant("22222222-2222-4222-8222-222222222222", [evidence])).toBe(false);
  });

  it("allows only the initial read-only MCP surface", () => {
    expect(evaluateN8nAgentTool("scheduling.find_available_slots")).toMatchObject({ allowed: true, execution: "read_only" });
    expect(evaluateN8nAgentTool("scheduling.create_appointment")).toMatchObject({ allowed: false, reason: "mutation_not_enabled", requiresConfirmation: true });
    expect(evaluateN8nAgentTool("unknown.tool")).toMatchObject({ allowed: false, reason: "tool_not_allowlisted" });
  });
});
