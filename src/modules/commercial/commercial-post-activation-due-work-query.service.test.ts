import { describe, expect, it, vi } from "vitest";

import { getCommercialPostActivationDueWorkSnapshot } from "./commercial-post-activation-due-work-query.service";

const now = new Date("2026-08-23T15:00:00.000Z");

function snapshot(overrides: Record<string, unknown> = {}) {
  return {
    total: 10,
    scheduled: 3,
    processing: 1,
    completed: 5,
    failed: 1,
    claimable: 2,
    overdue: 1,
    expiredLocks: 0,
    totalAttempts: 7,
    oldestOutstandingAt: "2026-08-23T14:00:00.000Z",
    ...overrides,
  };
}

function setup(value = snapshot()) {
  return {
    readSnapshot: vi.fn().mockResolvedValue(value),
  };
}

describe("commercial post-activation due work query", () => {
  it("projects an aggregated operational snapshot", async () => {
    const store = setup();
    await expect(getCommercialPostActivationDueWorkSnapshot({
      store,
      now: () => now,
    })).resolves.toEqual({
      ok: true,
      data: {
        recordedAt: "2026-08-23T15:00:00.000Z",
        status: "degraded",
        reasons: ["overdue_work", "failed_work"],
        total: 10,
        scheduled: 3,
        processing: 1,
        completed: 5,
        failed: 1,
        claimable: 2,
        overdue: 1,
        expiredLocks: 0,
        totalAttempts: 7,
        oldestOutstandingAt: "2026-08-23T14:00:00.000Z",
        oldestOutstandingAgeSeconds: 3600,
      },
    });
    expect(store.readSnapshot).toHaveBeenCalledWith(now);
  });

  it("reports an empty queue as healthy", async () => {
    const store = setup(snapshot({
      total: 0,
      scheduled: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      claimable: 0,
      overdue: 0,
      totalAttempts: 0,
      oldestOutstandingAt: null,
    }));
    await expect(getCommercialPostActivationDueWorkSnapshot({
      store,
      now: () => now,
    })).resolves.toMatchObject({
      ok: true,
      data: {
        status: "healthy",
        reasons: [],
        oldestOutstandingAgeSeconds: null,
      },
    });
  });

  it("treats expired processing locks as critical", async () => {
    const store = setup(snapshot({
      processing: 2,
      completed: 4,
      expiredLocks: 1,
    }));
    await expect(getCommercialPostActivationDueWorkSnapshot({
      store,
      now: () => now,
    })).resolves.toMatchObject({
      ok: true,
      data: {
        status: "critical",
        reasons: [
          "overdue_work",
          "failed_work",
          "expired_processing_locks",
        ],
      },
    });
  });

  it("does not report a negative age for future work", async () => {
    const store = setup(snapshot({
      oldestOutstandingAt: "2026-08-23T16:00:00.000Z",
    }));
    await expect(getCommercialPostActivationDueWorkSnapshot({
      store,
      now: () => now,
    })).resolves.toMatchObject({
      ok: true,
      data: { oldestOutstandingAgeSeconds: 0 },
    });
  });

  it("rejects malformed snapshots", async () => {
    const store = setup(snapshot({ scheduled: -1 }));
    await expect(getCommercialPostActivationDueWorkSnapshot({
      store,
      now: () => now,
    })).resolves.toMatchObject({
      ok: false,
      error: "invalid_snapshot",
    });
  });

  it("rejects internally inconsistent counters", async () => {
    const store = setup(snapshot({ claimable: 99 }));
    await expect(getCommercialPostActivationDueWorkSnapshot({
      store,
      now: () => now,
    })).resolves.toMatchObject({
      ok: false,
      error: "invalid_snapshot",
    });
  });

  it("keeps storage failures observable", async () => {
    const failure = new Error("database unavailable");
    const store = setup();
    store.readSnapshot.mockRejectedValue(failure);
    await expect(getCommercialPostActivationDueWorkSnapshot({
      store,
      now: () => now,
    })).rejects.toBe(failure);
  });
});
