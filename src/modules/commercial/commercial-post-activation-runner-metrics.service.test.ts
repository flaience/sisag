import { describe, expect, it } from "vitest";

import {
  projectCommercialPostActivationRunnerMetrics,
  type CommercialPostActivationRunnerMetrics,
} from "./commercial-post-activation-runner-metrics.service";

const executedAt = "2026-08-17T01:00:00.000Z";

function summary(failed = 0) {
  return {
    executedAt,
    scanned: 4,
    due: 2,
    processed: 2 - failed,
    failed,
  };
}

function previous(
  overrides: Partial<CommercialPostActivationRunnerMetrics> = {},
): CommercialPostActivationRunnerMetrics {
  return {
    totalRuns: 5,
    successfulRuns: 4,
    failedRuns: 1,
    consecutiveFailedRuns: 1,
    lastRunAt: "2026-08-17T00:45:00.000Z",
    lastSuccessfulRunAt: "2026-08-17T00:30:00.000Z",
    lastFailureAt: "2026-08-17T00:45:00.000Z",
    status: "degraded",
    ...overrides,
  };
}

describe("commercial post-activation runner metrics", () => {
  it("creates healthy metrics for the first successful run", () => {
    expect(projectCommercialPostActivationRunnerMetrics(summary())).toEqual({
      ok: true,
      metrics: {
        totalRuns: 1,
        successfulRuns: 1,
        failedRuns: 0,
        consecutiveFailedRuns: 0,
        lastRunAt: executedAt,
        lastSuccessfulRunAt: executedAt,
        lastFailureAt: null,
        status: "healthy",
      },
    });
  });

  it("marks a partial failure as degraded", () => {
    expect(projectCommercialPostActivationRunnerMetrics(summary(1))).toEqual({
      ok: true,
      metrics: {
        totalRuns: 1,
        successfulRuns: 0,
        failedRuns: 1,
        consecutiveFailedRuns: 1,
        lastRunAt: executedAt,
        lastSuccessfulRunAt: null,
        lastFailureAt: executedAt,
        status: "degraded",
      },
    });
  });

  it("becomes critical after three consecutive failed runs", () => {
    const result = projectCommercialPostActivationRunnerMetrics(
      summary(1),
      previous({ consecutiveFailedRuns: 2 }),
    );

    expect(result).toMatchObject({
      ok: true,
      metrics: {
        totalRuns: 6,
        successfulRuns: 4,
        failedRuns: 2,
        consecutiveFailedRuns: 3,
        lastSuccessfulRunAt: "2026-08-17T00:30:00.000Z",
        lastFailureAt: executedAt,
        status: "critical",
      },
    });
  });

  it("resets the consecutive failure counter after a successful run", () => {
    const result = projectCommercialPostActivationRunnerMetrics(
      summary(),
      previous({ consecutiveFailedRuns: 4, status: "critical" }),
    );

    expect(result).toMatchObject({
      ok: true,
      metrics: {
        totalRuns: 6,
        successfulRuns: 5,
        failedRuns: 1,
        consecutiveFailedRuns: 0,
        lastSuccessfulRunAt: executedAt,
        lastFailureAt: "2026-08-17T00:45:00.000Z",
        status: "healthy",
      },
    });
  });

  it("rejects internally inconsistent summaries", () => {
    expect(projectCommercialPostActivationRunnerMetrics({
      ...summary(),
      due: 1,
      processed: 2,
    })).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects invalid previous metrics", () => {
    expect(projectCommercialPostActivationRunnerMetrics(
      summary(),
      previous({ totalRuns: -1 }),
    )).toMatchObject({ ok: false, error: "invalid_input" });
  });
});
