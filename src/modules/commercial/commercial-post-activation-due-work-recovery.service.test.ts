import { describe, expect, it, vi } from "vitest";

import { recoverCommercialPostActivationDueWork } from "./commercial-post-activation-due-work-recovery.service";

const firstId = "53164020-8778-4226-afed-189e8d2333cc";
const secondId = "63164020-8778-4226-afed-189e8d2333cc";
const now = new Date("2026-08-23T20:00:00.000Z");

function setup(expired: unknown[] = [{ id: firstId, attempts: 1 }]) {
  const tx = {
    listExpired: vi.fn().mockResolvedValue(expired),
    update: vi.fn().mockResolvedValue(undefined),
  };
  return {
    tx,
    store: { transaction: vi.fn(async (callback) => callback(tx)) },
  };
}

describe("commercial post-activation due work recovery", () => {
  it("recovers expired locks with bounded exponential backoff", async () => {
    const options = setup([
      { id: firstId, attempts: 1 },
      { id: secondId, attempts: 3 },
    ]);
    await expect(recoverCommercialPostActivationDueWork({ limit: 10 }, {
      store: options.store,
      now: () => now,
    })).resolves.toEqual({
      ok: true,
      recovered: 2,
      retryable: 2,
      exhausted: 0,
      items: [
        {
          workId: firstId,
          attempts: 1,
          retryable: true,
          nextRetryAt: "2026-08-23T20:01:00.000Z",
        },
        {
          workId: secondId,
          attempts: 3,
          retryable: true,
          nextRetryAt: "2026-08-23T20:04:00.000Z",
        },
      ],
    });
    expect(options.tx.listExpired).toHaveBeenCalledWith(10, now);
    expect(options.tx.update).toHaveBeenNthCalledWith(1, firstId, {
      status: "failed",
      availableAt: new Date("2026-08-23T20:01:00.000Z"),
      lockedUntil: null,
      lockedBy: null,
      lastError: "processing_lock_expired",
      completedAt: null,
      updatedAt: now,
    });
  });

  it("keeps exhausted work outside automatic retries", async () => {
    const options = setup([{ id: firstId, attempts: 5 }]);
    const result = await recoverCommercialPostActivationDueWork({}, {
      store: options.store,
      now: () => now,
    });
    expect(result).toEqual({
      ok: true,
      recovered: 1,
      retryable: 0,
      exhausted: 1,
      items: [{
        workId: firstId,
        attempts: 5,
        retryable: false,
        nextRetryAt: null,
      }],
    });
    expect(options.tx.update.mock.calls[0][1]).not.toHaveProperty("availableAt");
  });

  it("returns an empty idempotent recovery result", async () => {
    const options = setup([]);
    await expect(recoverCommercialPostActivationDueWork({}, {
      store: options.store,
      now: () => now,
    })).resolves.toEqual({
      ok: true,
      recovered: 0,
      retryable: 0,
      exhausted: 0,
      items: [],
    });
    expect(options.tx.update).not.toHaveBeenCalled();
  });

  it("caps the recovery delay", async () => {
    const options = setup([{ id: firstId, attempts: 4 }]);
    await expect(recoverCommercialPostActivationDueWork({}, {
      store: options.store,
      now: () => now,
      maxAttempts: 10,
      baseBackoffSeconds: 60,
      maxBackoffSeconds: 300,
    })).resolves.toMatchObject({
      ok: true,
      items: [{ nextRetryAt: "2026-08-23T20:05:00.000Z" }],
    });
  });

  it.each([
    { limit: 0 },
    { limit: 101 },
  ])("rejects invalid input before opening a transaction", async (input) => {
    const options = setup();
    await expect(recoverCommercialPostActivationDueWork(input, {
      store: options.store,
      now: () => now,
    })).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(options.store.transaction).not.toHaveBeenCalled();
  });

  it("rejects an invalid recovery policy before storage", async () => {
    const options = setup();
    await expect(recoverCommercialPostActivationDueWork({}, {
      store: options.store,
      now: () => now,
      baseBackoffSeconds: 120,
      maxBackoffSeconds: 60,
    })).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(options.store.transaction).not.toHaveBeenCalled();
  });

  it("rejects malformed or oversized locked selections before writing", async () => {
    const options = setup([{ id: "invalid", attempts: 0 }]);
    await expect(recoverCommercialPostActivationDueWork({ limit: 1 }, {
      store: options.store,
      now: () => now,
    })).resolves.toMatchObject({
      ok: false,
      error: "invalid_expired_work",
    });
    expect(options.tx.update).not.toHaveBeenCalled();
  });

  it("keeps transaction failures observable", async () => {
    const failure = new Error("database unavailable");
    const options = setup();
    options.store.transaction.mockRejectedValue(failure);
    await expect(recoverCommercialPostActivationDueWork({}, {
      store: options.store,
      now: () => now,
    })).rejects.toBe(failure);
  });
});
