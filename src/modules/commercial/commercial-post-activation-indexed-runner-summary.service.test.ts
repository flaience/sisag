import { describe, expect, it } from "vitest";

import { composeCommercialPostActivationIndexedRunnerSummary } from "./commercial-post-activation-indexed-runner-summary.service";

const cursor = "23164020-8778-4226-afed-189e8d2333cc";

function input(overrides: Record<string, unknown> = {}) {
  return {
    executedAt: "2026-08-25T22:00:00.000Z",
    projection: {
      scanned: 2,
      cursor,
      wrapped: true,
      synchronized: 2,
      failed: 0,
      created: 1,
      updated: 0,
      preserved: 8,
      completed: 1,
      failures: [],
    },
    processing: {
      claimed: 5,
      completed: 2,
      deferred: 1,
      escalated: 1,
      failed: 1,
      settlementFailed: 0,
      status: "healthy",
    },
    recovery: { recovered: 1, retryable: 1, exhausted: 0 },
    ...overrides,
  };
}

describe("commercial post-activation indexed runner summary", () => {
  it("composes one legacy-compatible summary from indexed stages", () => {
    expect(composeCommercialPostActivationIndexedRunnerSummary(input())).toEqual({
      ok: true,
      summary: {
        source: "indexed",
        executedAt: "2026-08-25T22:00:00.000Z",
        cursor,
        wrapped: true,
        scanned: 5,
        due: 5,
        processed: 4,
        waiting: 1,
        completed: 2,
        escalated: 1,
        plansCompleted: 0,
        failed: 1,
        failures: [],
        dueWork: input().projection,
        recovery: { recovered: 1, retryable: 1, exhausted: 0 },
        processing: input().processing,
        projectionScanned: 2,
        status: "degraded",
        reasons: ["processing_failure"],
      },
    });
  });

  it("keeps work capacity separate from onboarding projection fairness", () => {
    const result = composeCommercialPostActivationIndexedRunnerSummary(input({
      projection: { ...input().projection as object, scanned: 1, synchronized: 1 },
      processing: { ...input().processing as object, claimed: 0, completed: 0, deferred: 0, escalated: 0, failed: 0 },
    }));

    expect(result).toMatchObject({
      ok: true,
      summary: { scanned: 0, due: 0, projectionScanned: 1 },
    });
  });

  it("marks settlement failures as critical", () => {
    const processing = {
      ...input().processing as object,
      completed: 1,
      settlementFailed: 1,
      status: "degraded",
    };
    expect(composeCommercialPostActivationIndexedRunnerSummary(input({ processing })))
      .toMatchObject({
        ok: true,
        summary: {
          failed: 2,
          status: "critical",
          reasons: ["processing_failure", "settlement_failure"],
        },
      });
  });

  it("marks projection failures as critical and preserves their details", () => {
    const projection = {
      ...input().projection as object,
      synchronized: 1,
      failed: 1,
      failures: [{ onboardingId: cursor, error: "invalid_plan" }],
    };
    expect(composeCommercialPostActivationIndexedRunnerSummary(input({ projection })))
      .toMatchObject({
        ok: true,
        summary: {
          status: "critical",
          reasons: ["projection_failure", "processing_failure"],
          failures: [{ onboardingId: cursor, error: "invalid_plan" }],
        },
      });
  });

  it("reports exhausted recovery as degraded", () => {
    expect(composeCommercialPostActivationIndexedRunnerSummary(input({
      recovery: { recovered: 1, retryable: 0, exhausted: 1 },
      processing: {
        claimed: 0, completed: 0, deferred: 0, escalated: 0,
        failed: 0, settlementFailed: 0, status: "healthy",
      },
    }))).toMatchObject({
      ok: true,
      summary: { status: "degraded", reasons: ["recovery_exhausted"] },
    });
  });

  it("returns healthy when every indexed stage is healthy", () => {
    expect(composeCommercialPostActivationIndexedRunnerSummary(input({
      processing: {
        claimed: 1, completed: 1, deferred: 0, escalated: 0,
        failed: 0, settlementFailed: 0, status: "healthy",
      },
      recovery: { recovered: 0, retryable: 0, exhausted: 0 },
    }))).toMatchObject({
      ok: true,
      summary: { status: "healthy", reasons: [], scanned: 1, processed: 1, failed: 0 },
    });
  });

  it("rejects unaccounted claimed work", () => {
    const processing = { ...input().processing as object, claimed: 6 };
    expect(composeCommercialPostActivationIndexedRunnerSummary(input({ processing })))
      .toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects inconsistent projection and recovery coverage", () => {
    expect(composeCommercialPostActivationIndexedRunnerSummary(input({
      projection: { ...input().projection as object, failed: 1 },
    }))).toMatchObject({ ok: false, error: "invalid_input" });
    expect(composeCommercialPostActivationIndexedRunnerSummary(input({
      recovery: { recovered: 2, retryable: 1, exhausted: 0 },
    }))).toMatchObject({ ok: false, error: "invalid_input" });
  });
});
