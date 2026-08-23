import { describe, expect, it, vi } from "vitest";

import { settleCommercialPostActivationDueWork } from "./commercial-post-activation-due-work-settlement.service";

const workId = "53164020-8778-4226-afed-189e8d2333cc";
const workerKey = "worker:saopaulo-1";
const now = new Date("2026-08-23T19:00:00.000Z");

function work(overrides: Record<string, unknown> = {}) {
  return {
    id: workId,
    status: "processing",
    attempts: 1,
    lockedUntil: "2026-08-23T19:05:00.000Z",
    lockedBy: workerKey,
    ...overrides,
  };
}

function setup(stored: ReturnType<typeof work> | null = work()) {
  const tx = {
    find: vi.fn().mockResolvedValue(stored),
    update: vi.fn().mockResolvedValue(undefined),
  };
  return {
    tx,
    store: { transaction: vi.fn(async (callback) => callback(tx)) },
  };
}

describe("commercial post-activation due work settlement", () => {
  it("completes only work owned by the active worker", async () => {
    const options = setup();
    await expect(settleCommercialPostActivationDueWork({
      workId,
      workerKey,
      outcome: "completed",
    }, {
      store: options.store,
      now: () => now,
    })).resolves.toEqual({
      ok: true,
      workId,
      outcome: "completed",
      attempts: 1,
      retryable: false,
      nextRetryAt: null,
    });
    expect(options.tx.update).toHaveBeenCalledWith(workId, {
      status: "completed",
      lockedUntil: null,
      lockedBy: null,
      lastError: null,
      completedAt: now,
      updatedAt: now,
    });
  });

  it("schedules failed work with exponential backoff", async () => {
    const options = setup(work({ attempts: 3 }));
    await expect(settleCommercialPostActivationDueWork({
      workId,
      workerKey,
      outcome: "failed",
      error: "provider_unavailable",
    }, {
      store: options.store,
      now: () => now,
    })).resolves.toEqual({
      ok: true,
      workId,
      outcome: "failed",
      attempts: 3,
      retryable: true,
      nextRetryAt: "2026-08-23T19:04:00.000Z",
    });
    expect(options.tx.update).toHaveBeenCalledWith(workId, {
      status: "failed",
      availableAt: new Date("2026-08-23T19:04:00.000Z"),
      lockedUntil: null,
      lockedBy: null,
      lastError: "provider_unavailable",
      completedAt: null,
      updatedAt: now,
    });
  });

  it("caps the retry delay", async () => {
    const options = setup(work({ attempts: 4 }));
    await expect(settleCommercialPostActivationDueWork({
      workId, workerKey, outcome: "failed", error: "timeout",
    }, {
      store: options.store,
      now: () => now,
      baseBackoffSeconds: 60,
      maxBackoffSeconds: 300,
      maxAttempts: 10,
    })).resolves.toMatchObject({
      ok: true,
      nextRetryAt: "2026-08-23T19:05:00.000Z",
    });
  });

  it("stops automatic retries at the attempt limit", async () => {
    const options = setup(work({ attempts: 5 }));
    const result = await settleCommercialPostActivationDueWork({
      workId, workerKey, outcome: "failed", error: "permanent_failure",
    }, { store: options.store, now: () => now });
    expect(result).toMatchObject({
      ok: true,
      attempts: 5,
      retryable: false,
      nextRetryAt: null,
    });
    expect(options.tx.update.mock.calls[0][1]).not.toHaveProperty("availableAt");
  });

  it.each([
    [null, "work_not_found"],
    [work({ status: "completed" }), "work_not_processing"],
    [work({ lockedBy: "worker:other" }), "claim_not_owned"],
    [work({ lockedUntil: "2026-08-23T19:00:00.000Z" }), "claim_expired"],
  ])("rejects invalid claim state without writing", async (stored, error) => {
    const options = setup(stored as ReturnType<typeof work> | null);
    await expect(settleCommercialPostActivationDueWork({
      workId,
      workerKey,
      outcome: "completed",
    }, {
      store: options.store,
      now: () => now,
    })).resolves.toMatchObject({ ok: false, error });
    expect(options.tx.update).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { workId: "invalid", workerKey, outcome: "completed" },
    { workId, workerKey: "invalid worker", outcome: "completed" },
    { workId, workerKey, outcome: "unknown" },
    { workId, workerKey, outcome: "failed" },
    { workId, workerKey, outcome: "failed", error: "" },
  ])("rejects malformed settlement input", async (input) => {
    const options = setup();
    await expect(settleCommercialPostActivationDueWork(input, {
      store: options.store,
      now: () => now,
    })).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(options.store.transaction).not.toHaveBeenCalled();
  });

  it("rejects an invalid retry policy before storage", async () => {
    const options = setup();
    await expect(settleCommercialPostActivationDueWork({
      workId, workerKey, outcome: "completed",
    }, {
      store: options.store,
      now: () => now,
      baseBackoffSeconds: 120,
      maxBackoffSeconds: 60,
    })).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(options.store.transaction).not.toHaveBeenCalled();
  });

  it("keeps transaction failures observable", async () => {
    const failure = new Error("database unavailable");
    const options = setup();
    options.store.transaction.mockRejectedValue(failure);
    await expect(settleCommercialPostActivationDueWork({
      workId, workerKey, outcome: "completed",
    }, {
      store: options.store,
      now: () => now,
    })).rejects.toBe(failure);
  });
});
