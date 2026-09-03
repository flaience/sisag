import { describe, expect, it } from "vitest";
import { pct, summarizeAgentObservability } from "./BookingRecoveryAgentOutcomes.service";

const date = new Date("2026-09-03T12:00:00Z");
type Row = Parameters<typeof summarizeAgentObservability>[0][number];
const row = (overrides: Partial<Row> = {}): Row => ({ status: "accepted", engine: "recovery_rules_v1", confidence: 90, suggestedAction: "human_contact", suggestedPriority: "urgent", decidedAction: "human_contact", decidedPriority: "urgent", agentDecision: { suggestedAction: "human_contact", suggestedPriority: "urgent", confidence: 92 }, agentExecution: { mode: "ai", provider: "openai", model: "model-a", inputTokens: 20, outputTokens: 10, durationMs: 100, errorCode: null }, createdAt: date, reviewedAt: new Date(date.getTime() + 60000), ...overrides });

describe("agent outcomes", () => {
  it("calculates stable percentages", () => { expect(pct(3, 4)).toBe(75); expect(pct(0, 0)).toBe(0); });
  it("measures AI, fallback, tokens and latency", () => {
    const result = summarizeAgentObservability([row(), row({ status: "shadow", decidedAction: null, decidedPriority: null, agentExecution: { mode: "fallback", provider: "openai", model: null, inputTokens: 0, outputTokens: 0, durationMs: 300, errorCode: "provider_error" } })]);
    expect(result.agent).toMatchObject({ executions: 2, aiRuns: 1, fallbackRuns: 1, aiRate: 50, fallbackRate: 50, inputTokens: 20, outputTokens: 10, totalTokens: 30, averageDurationMs: 200, p95DurationMs: 300 });
    expect(result.errors).toEqual([{ errorCode: "provider_error", count: 1 }]);
  });
  it("compares agent with deterministic and human decisions", () => {
    const result = summarizeAgentObservability([row(), row({ status: "adjusted", decidedAction: "review_response", agentDecision: { suggestedAction: "review_response", suggestedPriority: "urgent" } })]);
    expect(result.agent).toMatchObject({ agentDeterministicAgreementRate: 50, agentHumanAgreementRate: 100, humanComparisons: 2 });
    expect(result.summary.agreementRate).toBe(50);
  });
  it("ignores malformed historical metadata safely", () => {
    const result = summarizeAgentObservability([row({ agentDecision: "invalid", agentExecution: null })]);
    expect(result.agent).toMatchObject({ executions: 0, aiRate: 0, totalTokens: 0, p95DurationMs: 0 });
  });
});
