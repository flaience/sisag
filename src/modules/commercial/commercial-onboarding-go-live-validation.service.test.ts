import { describe, expect, it } from "vitest";

import {
  buildCommercialOnboardingGoLiveChecklist,
  evaluateCommercialOnboardingGoLive,
} from "./commercial-onboarding-go-live-validation.service";

const checklist = buildCommercialOnboardingGoLiveChecklist();

function evidence(checkCode: string, overrides: Record<string, unknown> = {}) {
  return {
    checkCode,
    status: "passed" as const,
    checkedAt: "2026-08-12T21:00:00.000Z",
    checkedBy: { type: "system" as const, id: "production-readiness" },
    details: "Validação concluída com sucesso.",
    ...overrides,
  };
}

const allEvidence = () => checklist.checks.map((check) => evidence(check.code));

describe("commercial onboarding go-live validation", () => {
  it("builds a versioned checklist with every mandatory check", () => {
    expect(checklist.version).toBe("2026-08-v1");
    expect(checklist.checks.map((check) => check.code)).toEqual([
      "company_configuration",
      "scheduling_configuration",
      "team_configuration",
      "active_channels",
      "training_completion",
      "operational_health",
    ]);
    expect(checklist.checks.every((check) => check.required)).toBe(true);
  });

  it("reports missing checks", () => {
    expect(evaluateCommercialOnboardingGoLive(checklist, [])).toEqual({
      ready: false,
      error: "go_live_not_ready",
      missingChecks: checklist.checks.map((check) => check.code),
      failedChecks: [],
    });
  });

  it("blocks go-live when a mandatory check fails", () => {
    const result = evaluateCommercialOnboardingGoLive(checklist, [
      ...allEvidence().slice(0, -1),
      evidence("operational_health", { status: "failed" }),
    ]);
    expect(result).toEqual({
      ready: false,
      error: "go_live_not_ready",
      missingChecks: [],
      failedChecks: ["operational_health"],
    });
  });

  it("uses the latest evidence for a repeated check", () => {
    const result = evaluateCommercialOnboardingGoLive(checklist, [
      evidence("operational_health", {
        status: "failed",
        checkedAt: "2026-08-12T20:00:00.000Z",
      }),
      ...allEvidence(),
    ]);
    expect(result).toMatchObject({ ready: true });
  });

  it("does not allow an older success to replace a newer failure", () => {
    const result = evaluateCommercialOnboardingGoLive(checklist, [
      ...allEvidence(),
      evidence("active_channels", {
        status: "failed",
        checkedAt: "2026-08-12T22:00:00.000Z",
      }),
    ]);
    expect(result).toMatchObject({
      ready: false,
      failedChecks: ["active_channels"],
    });
  });

  it("rejects malformed evidence", () => {
    const result = evaluateCommercialOnboardingGoLive(checklist, [
      evidence("operational_health", { details: "" }),
    ]);
    expect(result).toMatchObject({ ready: false, error: "invalid_evidence" });
  });

  it("authorizes go-live only after every check passes", () => {
    const result = evaluateCommercialOnboardingGoLive(checklist, [
      ...allEvidence().slice(0, -1),
      evidence("operational_health", { checkedAt: "2026-08-12T21:30:00.000Z" }),
    ]);
    expect(result).toMatchObject({
      ready: true,
      result: {
        checklistVersion: "2026-08-v1",
        passedChecks: checklist.checks.map((check) => check.code),
        validatedAt: "2026-08-12T21:30:00.000Z",
      },
    });
  });
});

