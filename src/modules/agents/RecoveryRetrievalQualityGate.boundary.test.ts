import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("recovery retrieval quality gate boundary", () => {
  const source = fs.readFileSync("src/modules/agents/RecoveryRetrievalQualityGate.ts", "utf8");
  it("uses a versioned and explicit policy", () => {
    for (const value of ["minimumExecutions", "minimumHumanComparisons", "minimumAvailabilityRate", "maximumFallbackRate", "maximumP95DurationMs", "maximumAverageTokens", "minimumAverageOverlapRate", "minimumHumanAgreementRate"]) expect(source).toContain(value);
    expect(source).toContain("recovery_retrieval_quality_v1");
  });
  it("never promotes automatically", () => {
    expect(source).toContain("automaticPromotion: false");
    for (const term of ["getDb", ".insert(", ".update(", "outbox", "WhatsApp", "activateProvider"]) expect(source).not.toContain(term);
  });
  it("does not misrepresent human outcomes as retrieval labels", () => {
    expect(source).toContain("workflow_correlation");
    expect(source).toContain("not a relevance label");
  });
});
