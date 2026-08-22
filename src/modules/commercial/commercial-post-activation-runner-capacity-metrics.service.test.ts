import { describe, expect, it } from "vitest";

import { projectCommercialPostActivationRunnerCapacityMetrics } from "./commercial-post-activation-runner-capacity-metrics.service";

const healthyInput = {
  startedAt: "2026-08-21T18:00:00.000Z",
  finishedAt: "2026-08-21T18:01:00.000Z",
  scheduleIntervalSeconds: 900,
  targetDurationSeconds: 300,
  batchLimit: 25,
  scanned: 10,
  due: 4,
  processed: 4,
  failed: 0,
};

describe("commercial post-activation runner capacity metrics", () => {
  it("projects a healthy execution with spare capacity", () => {
    expect(projectCommercialPostActivationRunnerCapacityMetrics(healthyInput)).toEqual({
      ok: true,
      metrics: {
        durationMilliseconds: 60000,
        durationSeconds: 60,
        scheduleIntervalSeconds: 900,
        targetDurationSeconds: 300,
        batchLimit: 25,
        scanned: 10,
        due: 4,
        processed: 4,
        failed: 0,
        batchUtilizationPercent: 40,
        processedPerMinute: 4,
        possibleBacklog: false,
        status: "healthy",
        reasons: [],
      },
    });
  });

  it("marks a full batch as possible backlog", () => {
    const result = projectCommercialPostActivationRunnerCapacityMetrics({
      ...healthyInput,
      scanned: 25,
      due: 20,
      processed: 20,
    });

    expect(result).toMatchObject({
      ok: true,
      metrics: {
        batchUtilizationPercent: 100,
        possibleBacklog: true,
        status: "degraded",
        reasons: ["batch_saturated"],
      },
    });
  });

  it("marks an execution over the duration target as degraded", () => {
    const result = projectCommercialPostActivationRunnerCapacityMetrics({
      ...healthyInput,
      finishedAt: "2026-08-21T18:05:00.000Z",
    });

    expect(result).toMatchObject({
      ok: true,
      metrics: {
        durationSeconds: 300,
        status: "degraded",
        reasons: ["duration_target_exceeded"],
      },
    });
  });

  it("marks an execution reaching its schedule interval as critical", () => {
    const result = projectCommercialPostActivationRunnerCapacityMetrics({
      ...healthyInput,
      finishedAt: "2026-08-21T18:15:00.000Z",
    });

    expect(result).toMatchObject({
      ok: true,
      metrics: {
        durationSeconds: 900,
        status: "critical",
        reasons: ["duration_target_exceeded", "schedule_interval_exceeded"],
      },
    });
  });

  it("combines saturation and duration reasons deterministically", () => {
    const result = projectCommercialPostActivationRunnerCapacityMetrics({
      ...healthyInput,
      finishedAt: "2026-08-21T18:15:00.000Z",
      scanned: 25,
      due: 25,
      processed: 24,
      failed: 1,
    });

    expect(result).toMatchObject({
      ok: true,
      metrics: {
        status: "critical",
        reasons: [
          "batch_saturated",
          "duration_target_exceeded",
          "schedule_interval_exceeded",
        ],
      },
    });
  });

  it("returns null throughput for a zero-duration execution", () => {
    const result = projectCommercialPostActivationRunnerCapacityMetrics({
      ...healthyInput,
      finishedAt: healthyInput.startedAt,
      scanned: 0,
      due: 0,
      processed: 0,
    });

    expect(result).toMatchObject({
      ok: true,
      metrics: { durationSeconds: 0, processedPerMinute: null },
    });
  });

  it.each([
    [{ ...healthyInput, finishedAt: "2026-08-21T17:59:59.000Z" }],
    [{ ...healthyInput, scanned: 26 }],
    [{ ...healthyInput, due: 11 }],
    [{ ...healthyInput, processed: 5 }],
    [{ ...healthyInput, failed: 5 }],
    [{ ...healthyInput, scheduleIntervalSeconds: 299 }],
  ])("rejects inconsistent capacity input %#", (input) => {
    expect(projectCommercialPostActivationRunnerCapacityMetrics(input)).toEqual({
      ok: false,
      error: "invalid_input",
      message: "Dados de capacidade do runner pós-ativação inválidos.",
    });
  });
});
