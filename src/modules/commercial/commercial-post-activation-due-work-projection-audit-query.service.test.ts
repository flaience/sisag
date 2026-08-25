import { describe, expect, it, vi } from "vitest";

import { queryCommercialPostActivationProjectionAudit } from "./commercial-post-activation-due-work-projection-audit-query.service";

const cursor = "23164020-8778-4226-afed-189e8d2333cc";

function observation(index: number, overrides: Record<string, unknown> = {}) {
  const executedAt = new Date(Date.UTC(2026, 7, 25, 1, index * 15)).toISOString();
  const projection = {
    scanned: 1,
    cursor,
    wrapped: index === 0,
    synchronized: 1,
    failed: 0,
    created: 0,
    updated: 0,
    preserved: 5,
    completed: index === 0 ? 1 : 0,
    failures: [],
  };
  return {
    executedAt,
    projectionAudit: {
      matched: true,
      status: "healthy",
      differences: [],
      projection,
      ...overrides,
    },
  };
}

function setup(history: unknown[]) {
  return { store: { list: vi.fn().mockResolvedValue(history) } };
}

describe("commercial post-activation due work projection audit query", () => {
  it("marks sufficient consistent history as ready", async () => {
    const options = setup(Array.from({ length: 8 }, (_, index) => observation(index)));

    await expect(queryCommercialPostActivationProjectionAudit({}, {
      ...options,
      now: () => new Date("2026-08-25T04:00:00.000Z"),
    })).resolves.toEqual({
      ok: true,
      data: {
        recordedAt: "2026-08-25T04:00:00.000Z",
        status: "ready",
        reasons: [],
        requiredObservations: 8,
        observations: 8,
        matched: 8,
        divergent: 0,
        matchRatePercent: 100,
        firstObservedAt: "2026-08-25T01:00:00.000Z",
        lastObservedAt: "2026-08-25T02:45:00.000Z",
        wrappedObservations: 1,
        projectionFailures: 0,
        synchronized: 8,
        completed: 1,
        differences: {},
      },
    });
    expect(options.store.list).toHaveBeenCalledWith(96);
  });

  it("keeps a short healthy history collecting", async () => {
    const options = setup([observation(0), observation(1)]);

    await expect(queryCommercialPostActivationProjectionAudit({}, options))
      .resolves.toMatchObject({
        ok: true,
        data: {
          status: "collecting",
          reasons: ["insufficient_observations"],
          observations: 2,
          matched: 2,
        },
      });
  });

  it("blocks the cutover when any comparison diverges", async () => {
    const history = Array.from({ length: 8 }, (_, index) => observation(index));
    history[7] = observation(7, {
      matched: false,
      status: "degraded",
      differences: ["scanned", "cursor", "cursor"],
    });

    await expect(queryCommercialPostActivationProjectionAudit({}, setup(history)))
      .resolves.toMatchObject({
        ok: true,
        data: {
          status: "blocked",
          reasons: ["divergence_detected"],
          matched: 7,
          divergent: 1,
          matchRatePercent: 87.5,
          differences: { scanned: 1, cursor: 1 },
        },
      });
  });

  it("blocks the cutover when projection failures were observed", async () => {
    const failed = observation(0);
    failed.projectionAudit.projection.failed = 1;
    failed.projectionAudit.projection.synchronized = 0;

    await expect(queryCommercialPostActivationProjectionAudit({}, {
      ...setup(Array.from({ length: 8 }, (_, index) => index === 0 ? failed : observation(index))),
    })).resolves.toMatchObject({
      ok: true,
      data: {
        status: "blocked",
        reasons: ["projection_failure_detected"],
        projectionFailures: 1,
      },
    });
  });

  it("requires a completed cursor cycle and completed work evidence", async () => {
    const history = Array.from({ length: 8 }, (_, index) => {
      const item = observation(index);
      item.projectionAudit.projection.wrapped = false;
      item.projectionAudit.projection.completed = 0;
      return item;
    });

    await expect(queryCommercialPostActivationProjectionAudit({}, setup(history)))
      .resolves.toMatchObject({
        ok: true,
        data: {
          status: "collecting",
          reasons: ["no_completed_cursor_cycle", "no_completed_work_observed"],
        },
      });
  });

  it("orders observation boundaries chronologically", async () => {
    const options = setup([observation(2), observation(0), observation(1)]);

    await expect(queryCommercialPostActivationProjectionAudit({}, {
      ...options,
      minObservations: 1,
    })).resolves.toMatchObject({
      ok: true,
      data: {
        firstObservedAt: "2026-08-25T01:00:00.000Z",
        lastObservedAt: "2026-08-25T01:30:00.000Z",
      },
    });
  });

  it("rejects invalid limits before reading history", async () => {
    const options = setup([]);

    await expect(queryCommercialPostActivationProjectionAudit({ limit: 0 }, options))
      .resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(options.store.list).not.toHaveBeenCalled();
  });

  it("rejects malformed stored observations", async () => {
    await expect(queryCommercialPostActivationProjectionAudit({}, setup([{
      executedAt: "invalid",
      projectionAudit: {},
    }]))).resolves.toMatchObject({ ok: false, error: "invalid_history" });
  });
});
