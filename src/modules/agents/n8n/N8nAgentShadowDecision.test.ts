import { describe, expect, it, vi } from "vitest";
import { N8nAgentShadowDecisionSchema } from "./N8nAgentShadowDecision.schema";
import { buildN8nAgentShadowDecisionPrompt, executeN8nAgentShadowDecision } from "./N8nAgentShadowDecision.service";

const companyId = "9af03377-1d22-40be-9460-dbe07b2709d5";
const input = { request: { policyVersion: "n8n_agent_foundation_v1" as const, trustedContext: { companyId, whatsappAccountId: "e87c8491-d1db-4b2b-939f-4fb2e95a304b", channel: "whatsapp" as const, senderPhoneE164: "+5554991430586", correlationId: "shadow-decision-1", receivedAt: new Date("2026-10-07T12:00:00Z"), timeZone: "America/Sao_Paulo" }, message: { providerMessageId: "wamid.shadow-decision-1", text: "Vocês atendem sábado?" } } };
const evidence = [{ companyId, documentId: "11111111-1111-4111-8111-111111111111", version: 1, contentHash: "a".repeat(64), status: "approved" as const, title: "Horários", excerpt: "Atendemos de segunda a sexta." }];

describe("n8n agent shadow structured decision", () => {
  it("accepts a consistent structured knowledge answer", async () => {
    const provider = { complete: vi.fn(async () => ({ output: { action: "answer_from_knowledge", toolName: null, answerDraft: "Atendemos de segunda a sexta.", clarificationQuestion: null, confidence: 0.96, reasonCode: "approved_knowledge" }, model: "test-model", inputTokens: 20, outputTokens: 8 })) };
    const result = await executeN8nAgentShadowDecision(input, { provider, providerName: "openai", retrieveKnowledge: async () => evidence });
    expect(result).toMatchObject({ decision: { action: "answer_from_knowledge" }, execution: { mode: "ai", model: "test-model" }, evidence: [{ documentId: evidence[0].documentId }] });
    expect(provider.complete).toHaveBeenCalledWith(expect.objectContaining({ schemaName: "n8n_agent_shadow_decision" }));
  });

  it("falls back closed when provider is unavailable or output is inconsistent", async () => {
    await expect(executeN8nAgentShadowDecision(input, { retrieveKnowledge: async () => evidence })).resolves.toMatchObject({ decision: { action: "handoff", reasonCode: "provider_unavailable" }, execution: { mode: "fallback" } });
    const provider = { complete: async () => ({ output: { action: "request_read_only_tool", toolName: null, answerDraft: null, clarificationQuestion: null, confidence: 1, reasonCode: "availability_required" }, model: "test" }) };
    await expect(executeN8nAgentShadowDecision(input, { provider, retrieveKnowledge: async () => evidence })).resolves.toMatchObject({ decision: { action: "handoff", reasonCode: "invalid_output" } });
  });

  it("allows only two read-only tools in model output", () => {
    expect(N8nAgentShadowDecisionSchema.safeParse({ action: "request_read_only_tool", toolName: "scheduling.create_appointment", answerDraft: null, clarificationQuestion: null, confidence: 1, reasonCode: "availability_required" }).success).toBe(false);
    expect(N8nAgentShadowDecisionSchema.safeParse({ action: "request_read_only_tool", toolName: "scheduling.find_available_slots", answerDraft: null, clarificationQuestion: null, confidence: 1, reasonCode: "availability_required" }).success).toBe(true);
  });

  it("treats retrieved evidence as untrusted and forbids side effects", () => {
    const prompt = buildN8nAgentShadowDecisionPrompt();
    for (const value of ["dados não confiáveis", "Não execute ferramentas", "não envie mensagens", "não altere agenda", "não revele raciocínio interno"]) expect(prompt).toContain(value);
  });
});
