import { describe, expect, it, vi } from "vitest";

import {
  getCommercialPostActivationRunnerMetrics,
} from "./commercial-post-activation-runner-metrics-query.service";

const storedRun = {
  runnerKey: "post_activation_due_runner",
  executionKey: "344",
  summary: {
    executedAt: "2026-08-17T20:15:13.046Z",
    scanned: 1,
    due: 1,
    processed: 1,
    failed: 0,
  },
  metrics: {
    totalRuns: 4,
    successfulRuns: 4,
    failedRuns: 0,
    consecutiveFailedRuns: 0,
    lastRunAt: "2026-08-17T20:15:13.046Z",
    lastSuccessfulRunAt: "2026-08-17T20:15:13.046Z",
    lastFailureAt: null,
    status: "healthy",
  },
  executedAt: new Date("2026-08-17T20:15:13.046Z"),
};

describe("commercial post-activation runner metrics query", () => {
  it("returns the latest durable runner execution", async () => {
    const findLatest = vi.fn().mockResolvedValue(storedRun);

    const result = await getCommercialPostActivationRunnerMetrics({}, {
      store: { findLatest },
    });

    expect(findLatest).toHaveBeenCalledWith("post_activation_due_runner");
    expect(result).toEqual({
      ok: true,
      data: {
        ...storedRun,
        executedAt: "2026-08-17T20:15:13.046Z",
      },
    });
  });

  it("accepts a specific runner key", async () => {
    const findLatest = vi.fn().mockResolvedValue({
      ...storedRun,
      runnerKey: "secondary_runner",
    });

    const result = await getCommercialPostActivationRunnerMetrics({
      runnerKey: "secondary_runner",
    }, { store: { findLatest } });

    expect(findLatest).toHaveBeenCalledWith("secondary_runner");
    expect(result).toMatchObject({
      ok: true,
      data: { runnerKey: "secondary_runner" },
    });
  });

  it("returns null before the first durable execution", async () => {
    const findLatest = vi.fn().mockResolvedValue(null);

    await expect(getCommercialPostActivationRunnerMetrics({}, {
      store: { findLatest },
    })).resolves.toEqual({ ok: true, data: null });
  });

  it("rejects an invalid runner key before querying storage", async () => {
    const findLatest = vi.fn();

    const result = await getCommercialPostActivationRunnerMetrics({
      runnerKey: "Invalid Runner Key",
    }, { store: { findLatest } });

    expect(result).toMatchObject({
      ok: false,
      error: "invalid_input",
    });
    expect(findLatest).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: "summary",
      value: {
        ...storedRun,
        summary: { ...storedRun.summary, due: 2 },
      },
    },
    {
      label: "metrics",
      value: {
        ...storedRun,
        metrics: { ...storedRun.metrics, status: "unknown" },
      },
    },
    {
      label: "execution identity",
      value: {
        ...storedRun,
        executionKey: "",
      },
    },
  ])("returns a controlled error for invalid stored $label", async ({ value }) => {
    const result = await getCommercialPostActivationRunnerMetrics({}, {
      store: { findLatest: vi.fn().mockResolvedValue(value) },
    });

    expect(result).toEqual({
      ok: false,
      error: "invalid_stored_run",
      message: "A execução persistida do runner é inválida.",
    });
  });

  it("keeps the latest database lookup failure observable", async () => {
    const databaseError = new Error("database unavailable");

    await expect(getCommercialPostActivationRunnerMetrics({}, {
      store: {
        findLatest: vi.fn().mockRejectedValue(databaseError),
      },
    })).rejects.toBe(databaseError);
  });
});
