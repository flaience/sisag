import { describe, expect, it, vi } from "vitest";

import {
  persistCommercialPostActivationRunnerMetrics,
} from "./commercial-post-activation-runner-metrics-persistence.service";
import type { CommercialPostActivationRunnerMetrics } from "./commercial-post-activation-runner-metrics.service";

const summary = {
  executedAt: "2026-08-17T18:00:04.021Z",
  cursor: "23164020-8778-4226-afed-189e8d2333cc",
  wrapped: false,
  scanned: 1,
  due: 1,
  processed: 1,
  failed: 0,
};

const projectionAudit = {
  matched: true,
  status: "healthy" as const,
  differences: [],
  projection: {
    scanned: 1,
    cursor: summary.cursor,
    wrapped: true,
    synchronized: 1,
    failed: 0,
    created: 0,
    updated: 0,
    preserved: 5,
    completed: 1,
    failures: [],
  },
};

function metrics(
  overrides: Partial<CommercialPostActivationRunnerMetrics> = {},
): CommercialPostActivationRunnerMetrics {
  return {
    totalRuns: 1,
    successfulRuns: 1,
    failedRuns: 0,
    consecutiveFailedRuns: 0,
    lastRunAt: summary.executedAt,
    lastSuccessfulRunAt: summary.executedAt,
    lastFailureAt: null,
    status: "healthy",
    ...overrides,
  };
}

function store(overrides: Record<string, unknown> = {}) {
  return {
    findByExecutionKey: vi.fn().mockResolvedValue(null),
    findLatest: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("commercial post-activation runner metrics persistence", () => {
  it("persists the first projected execution", async () => {
    const storage = store();

    const result = await persistCommercialPostActivationRunnerMetrics({
      executionKey: "n8n-execution-100",
      summary,
    }, { store: storage });

    expect(result).toEqual({
      ok: true,
      replayed: false,
      runnerKey: "post_activation_due_runner",
      executionKey: "n8n-execution-100",
      metrics: metrics(),
    });
    expect(storage.save).toHaveBeenCalledWith({
      runnerKey: "post_activation_due_runner",
      executionKey: "n8n-execution-100",
      summary,
      metrics: metrics(),
    });
  });

  it("validates and preserves projection audit evidence", async () => {
    const storage = store();

    const result = await persistCommercialPostActivationRunnerMetrics({
      executionKey: "n8n-execution-projection-audit",
      summary: { ...summary, projectionAudit },
    }, { store: storage });

    expect(result).toMatchObject({ ok: true, replayed: false });
    expect(storage.save).toHaveBeenCalledWith({
      runnerKey: "post_activation_due_runner",
      executionKey: "n8n-execution-projection-audit",
      summary: { ...summary, projectionAudit },
      metrics: metrics(),
    });
  });

  it("continues from the latest durable metrics", async () => {
    const previous = metrics({
      totalRuns: 4,
      successfulRuns: 3,
      failedRuns: 1,
      consecutiveFailedRuns: 1,
      status: "degraded",
    });
    const storage = store({
      findLatest: vi.fn().mockResolvedValue({ metrics: previous }),
    });

    const result = await persistCommercialPostActivationRunnerMetrics({
      runnerKey: "post_activation_due_runner",
      executionKey: "n8n-execution-101",
      summary,
    }, { store: storage });

    expect(result).toMatchObject({
      ok: true,
      replayed: false,
      metrics: {
        totalRuns: 5,
        successfulRuns: 4,
        failedRuns: 1,
        consecutiveFailedRuns: 0,
        status: "healthy",
      },
    });
  });

  it("replays an execution without projecting or writing again", async () => {
    const existing = metrics({ totalRuns: 7 });
    const storage = store({
      findByExecutionKey: vi.fn().mockResolvedValue({ metrics: existing }),
    });

    const result = await persistCommercialPostActivationRunnerMetrics({
      executionKey: "n8n-execution-replayed",
      summary,
    }, { store: storage });

    expect(result).toMatchObject({ ok: true, replayed: true, metrics: existing });
    expect(storage.findLatest).not.toHaveBeenCalled();
    expect(storage.save).not.toHaveBeenCalled();
  });

  it("recovers an idempotent concurrent insert", async () => {
    const concurrent = metrics({ totalRuns: 8 });
    const findByExecutionKey = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ metrics: concurrent });
    const storage = store({
      findByExecutionKey,
      save: vi.fn().mockResolvedValue(false),
    });

    const result = await persistCommercialPostActivationRunnerMetrics({
      executionKey: "n8n-execution-concurrent",
      summary,
    }, { store: storage });

    expect(result).toMatchObject({ ok: true, replayed: true, metrics: concurrent });
  });

  it("returns a controlled conflict when a rejected write cannot be found", async () => {
    const storage = store({ save: vi.fn().mockResolvedValue(false) });

    const result = await persistCommercialPostActivationRunnerMetrics({
      executionKey: "n8n-execution-missing",
      summary,
    }, { store: storage });

    expect(result).toEqual({
      ok: false,
      error: "persistence_conflict",
      message: "Não foi possível confirmar a persistência das métricas do runner.",
    });
  });

  it("rejects contradictory projection audit evidence", async () => {
    const storage = store();

    const result = await persistCommercialPostActivationRunnerMetrics({
      executionKey: "n8n-execution-invalid-audit",
      summary: {
        ...summary,
        projectionAudit: {
          ...projectionAudit,
          matched: true,
          status: "healthy",
          differences: ["cursor"],
        },
      },
    }, { store: storage });

    expect(result).toMatchObject({ ok: false, error: "invalid_input" });
    expect(storage.findByExecutionKey).not.toHaveBeenCalled();
    expect(storage.save).not.toHaveBeenCalled();
  });

  it("keeps legacy summaries without projection audit compatible", async () => {
    const storage = store();

    await expect(persistCommercialPostActivationRunnerMetrics({
      executionKey: "n8n-execution-legacy-summary",
      summary,
    }, { store: storage })).resolves.toMatchObject({ ok: true });
    expect(storage.save).toHaveBeenCalledWith(expect.objectContaining({ summary }));
  });

  it("rejects invalid execution identity before accessing storage", async () => {
    const storage = store();

    const result = await persistCommercialPostActivationRunnerMetrics({
      runnerKey: "Runner inválido",
      executionKey: "",
      summary,
    }, { store: storage });

    expect(result).toMatchObject({ ok: false, error: "invalid_input" });
    expect(storage.findByExecutionKey).not.toHaveBeenCalled();
  });
});
