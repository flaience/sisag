import { describe, expect, it } from "vitest";
import { executeRecoveryAgent } from "./RecoveryAgentRuntime";

const context = { score: 1, priority: "urgent", classification: "negative", slaEscalated: true, assigned: false, caseAgeMinutes: 120, responseAgeMinutes: 60 };

describe("recovery AI agent runtime", () => {
  it("accepts strict structured output and records metadata", async () => {
    const result = await executeRecoveryAgent({ context, providerName: "test", provider: { complete: async () => ({ model: "model-a", inputTokens: 20, outputTokens: 10, output: { suggestedAction: "human_contact", suggestedPriority: "urgent", confidence: 96, rationale: "Resposta negativa requer acolhimento humano imediato.", signals: ["negative_response"] } }) } });
    expect(result.execution).toMatchObject({ mode: "ai", provider: "test", model: "model-a", promptVersion: "recovery_decision_v1", inputTokens: 20, outputTokens: 10, errorCode: null });
    expect(result.execution.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.decision.confidence).toBe(96);
  });
  it("falls back when output is invalid", async () => {
    const result = await executeRecoveryAgent({ context, provider: { complete: async () => ({ model: "bad", output: { action: "send" } }) } });
    expect(result.execution).toMatchObject({ mode: "fallback", errorCode: "invalid_structured_output" });
    expect(result.decision.suggestedAction).toBe("human_contact");
  });
  it("falls back when no provider exists", async () => expect((await executeRecoveryAgent({ context })).execution.errorCode).toBe("provider_not_configured"));
  it("normalizes provider failures", async () => {
    const result = await executeRecoveryAgent({ context, provider: { complete: async () => { throw new Error("sensitive upstream detail"); } } });
    expect(result.execution).toMatchObject({ mode: "fallback", errorCode: "provider_error" });
  });
  it("does not call the provider when context retrieval is unavailable", async () => {
    let called = false;
    const result = await executeRecoveryAgent({ context, blockedReason: "context_unavailable", providerName: "test", provider: { complete: async () => { called = true; throw new Error("should_not_run"); } } });
    expect(called).toBe(false);
    expect(result.execution).toMatchObject({ mode: "fallback", errorCode: "context_unavailable" });
  });
});
