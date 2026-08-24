import { describe, expect, it, vi } from "vitest";

import { processCommercialPostActivationDueWorkBatch } from "./commercial-post-activation-due-work-batch-processor.service";

const workerKey = "worker:saopaulo-1";
const item = (position: number) => ({
  id: `53164020-8778-4226-afed-189e8d2333c${position}`,
  onboardingId: `23164020-8778-4226-afed-189e8d2333c${position}`,
  milestoneCode: "welcome",
  status: "processing",
  dueAt: "2026-08-24T01:00:00.000Z",
  availableAt: "2026-08-24T01:00:00.000Z",
  priority: 100,
  attempts: 1,
  lockedUntil: "2026-08-24T01:05:00.000Z",
  lockedBy: workerKey,
});

function setup(items = [item(1)]) {
  return {
    claim: vi.fn().mockResolvedValue({
      ok: true,
      workerKey,
      claimed: items.length,
      lockedUntil: "2026-08-24T01:05:00.000Z",
      items,
    }),
    execute: vi.fn().mockResolvedValue({
      ok: true,
      workId: items[0]?.id,
      workerKey,
      onboardingId: items[0]?.onboardingId,
      milestoneCode: "welcome",
      decision: "completed",
      settlementOutcome: "completed",
      deferSeconds: null,
      replayed: false,
      missingIndicators: [],
      activeEscalations: [],
      emittedEvents: [],
    }),
    settle: vi.fn().mockResolvedValue({
      ok: true,
      workId: items[0]?.id,
      outcome: "completed",
      attempts: 1,
      retryable: false,
      nextRetryAt: null,
    }),
  };
}

describe("commercial post-activation due work batch processor", () => {
  it("claims and completes a bounded batch", async () => {
    const options = setup();
    await expect(processCommercialPostActivationDueWorkBatch({ workerKey }, options))
      .resolves.toMatchObject({
        ok: true,
        claimed: 1,
        completed: 1,
        deferred: 0,
        escalated: 0,
        failed: 0,
        settlementFailed: 0,
      });
    expect(options.claim).toHaveBeenCalledWith({ workerKey, limit: 25, lockSeconds: 300 });
    expect(options.execute).toHaveBeenCalledWith({
      workId: item(1).id,
      workerKey,
      onboardingId: item(1).onboardingId,
      milestoneCode: "welcome",
    }, { deferSeconds: 900 });
    expect(options.settle).toHaveBeenCalledWith({
      workId: item(1).id,
      workerKey,
      outcome: "completed",
    });
  });

  it("returns an empty successful batch without opening workers", async () => {
    const options = setup([]);
    await expect(processCommercialPostActivationDueWorkBatch({ workerKey }, options))
      .resolves.toEqual({
        ok: true,
        workerKey,
        claimed: 0,
        completed: 0,
        deferred: 0,
        escalated: 0,
        failed: 0,
        settlementFailed: 0,
        items: [],
      });
    expect(options.execute).not.toHaveBeenCalled();
    expect(options.settle).not.toHaveBeenCalled();
  });

  it("settles business waits as deferred", async () => {
    const options = setup();
    options.execute.mockResolvedValue({
      ok: true,
      decision: "wait",
      settlementOutcome: "deferred",
      deferSeconds: 1200,
    });
    options.settle.mockResolvedValue({
      ok: true,
      outcome: "deferred",
      retryable: false,
      nextRetryAt: null,
      nextAvailableAt: "2026-08-24T01:20:00.000Z",
    });
    const result = await processCommercialPostActivationDueWorkBatch({ workerKey }, options);
    expect(result).toMatchObject({ ok: true, deferred: 1 });
    expect(options.settle).toHaveBeenCalledWith({
      workId: item(1).id,
      workerKey,
      outcome: "deferred",
      deferSeconds: 1200,
      missingIndicators: [],
    });
  });

  it("keeps policy escalations out of deferred and failed counters", async () => {
    const options = setup();
    options.execute.mockResolvedValue({
      ok: true,
      decision: "wait",
      settlementOutcome: "deferred",
      deferSeconds: 900,
      missingIndicators: ["support_channel_confirmed"],
    });
    options.settle.mockResolvedValue({
      ok: true,
      outcome: "escalated",
      retryable: false,
      nextRetryAt: null,
      escalationRequired: true,
    });
    await expect(processCommercialPostActivationDueWorkBatch({ workerKey }, options))
      .resolves.toMatchObject({
        ok: true,
        completed: 0,
        deferred: 0,
        escalated: 1,
        failed: 0,
      });
    expect(options.settle).toHaveBeenCalledWith(expect.objectContaining({
      missingIndicators: ["support_channel_confirmed"],
    }));
  });

  it("turns execution rejection into a retryable technical settlement", async () => {
    const options = setup();
    options.execute.mockResolvedValue({
      ok: false, error: "execution_rejected", message: "private detail",
    });
    options.settle.mockResolvedValue({
      ok: true,
      outcome: "failed",
      retryable: true,
      nextRetryAt: "2026-08-24T01:01:00.000Z",
    });
    await expect(processCommercialPostActivationDueWorkBatch({ workerKey }, options))
      .resolves.toMatchObject({ ok: true, failed: 1 });
    expect(options.settle).toHaveBeenCalledWith(expect.objectContaining({
      outcome: "failed",
      error: "execution_execution_rejected",
    }));
  });

  it("keeps failed settlement visible for lock recovery", async () => {
    const options = setup();
    options.settle.mockResolvedValue({
      ok: false, error: "claim_expired", message: "private detail",
    });
    await expect(processCommercialPostActivationDueWorkBatch({ workerKey }, options))
      .resolves.toMatchObject({
        ok: true,
        settlementFailed: 1,
        items: [expect.objectContaining({
          outcome: "settlement_failed",
          error: "settlement_claim_expired",
        })],
      });
  });

  it("bounds item concurrency", async () => {
    const items = [item(1), item(2), item(3), item(4)];
    const options = setup(items);
    let active = 0;
    let maximum = 0;
    options.execute.mockImplementation(async (value) => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return {
        ok: true,
        ...value,
        decision: "completed",
        settlementOutcome: "completed",
        deferSeconds: null,
      };
    });
    await processCommercialPostActivationDueWorkBatch({ workerKey, concurrency: 2 }, options);
    expect(maximum).toBe(2);
    expect(options.execute).toHaveBeenCalledTimes(4);
  });

  it.each([
    {},
    { workerKey: "invalid worker" },
    { workerKey, limit: 101 },
    { workerKey, concurrency: 21 },
    { workerKey, lockSeconds: 29 },
    { workerKey, deferSeconds: 29 },
  ])("rejects malformed batch input before claiming", async (input) => {
    const options = setup();
    await expect(processCommercialPostActivationDueWorkBatch(input, options))
      .resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(options.claim).not.toHaveBeenCalled();
  });

  it("preserves a failed claim result", async () => {
    const options = setup();
    options.claim.mockResolvedValue({
      ok: false, error: "invalid_claimed_work", message: "invalid claim",
    });
    await expect(processCommercialPostActivationDueWorkBatch({ workerKey }, options))
      .resolves.toEqual({ ok: false, error: "claim_failed", message: "invalid claim" });
    expect(options.execute).not.toHaveBeenCalled();
  });

  it("attempts failure settlement after unexpected execution errors", async () => {
    const options = setup();
    options.execute.mockRejectedValue(new Error("provider unavailable"));
    options.settle.mockResolvedValue({
      ok: true, outcome: "failed", retryable: true, nextRetryAt: null,
    });
    await processCommercialPostActivationDueWorkBatch({ workerKey }, options);
    expect(options.settle).toHaveBeenCalledWith(expect.objectContaining({
      outcome: "failed",
      error: "unexpected_execution_error",
    }));
  });
});
