import { describe, expect, it } from "vitest";
import { evaluateRecoveryRetrievalQuality } from "./RecoveryRetrievalQualityGate";

const metrics = (overrides = {}) => ({
  executions: 30, vectorRuns: 30, fallbackRuns: 0, availabilityRate: 100, fallbackRate: 0,
  p95DurationMs: 900, averageTokens: 120, averageOverlapRate: 67, humanComparisons: 10,
  humanAgreementRate: 80, ...overrides,
});

describe("recovery retrieval quality gate", () => {
  it("keeps small samples as insufficient data", () => {
    expect(evaluateRecoveryRetrievalQuality(metrics({ executions: 29 })).status).toBe("insufficient_data");
  });

  it("keeps retrieval in shadow when a quality check fails", () => {
    const result = evaluateRecoveryRetrievalQuality(metrics({ fallbackRate: 10, fallbackRuns: 3, vectorRuns: 27 }));
    expect(result.status).toBe("keep_shadow");
    expect(result.reasons).toContain("fallback_rate:10:lte:5");
  });

  it("marks evidence eligible only for human review", () => {
    const result = evaluateRecoveryRetrievalQuality(metrics());
    expect(result).toMatchObject({ status: "eligible", automaticPromotion: false, policyVersion: "recovery_retrieval_quality_v1" });
    expect(result.checks.some(check => check.evidence === "workflow_correlation")).toBe(true);
  });
});
