import { describe, expect, it, vi } from "vitest";

import { claimCommercialPostActivationDueWork } from "./commercial-post-activation-due-work-claim.service";

const now = new Date("2026-08-23T18:00:00.000Z");
const lockedUntil = "2026-08-23T18:05:00.000Z";
const workerKey = "worker:saopaulo-1";

function item(overrides: Record<string, unknown> = {}) {
  return {
    id: "53164020-8778-4226-afed-189e8d2333cc",
    onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
    milestoneCode: "welcome",
    status: "processing",
    dueAt: "2026-08-23T17:00:00.000Z",
    availableAt: "2026-08-23T17:00:00.000Z",
    priority: 100,
    attempts: 1,
    lockedUntil,
    lockedBy: workerKey,
    ...overrides,
  };
}

function setup(items: unknown[] = [item()]) {
  return {
    claim: vi.fn().mockResolvedValue(items),
  };
}

describe("commercial post-activation due work claim", () => {
  it("claims a bounded batch with a finite worker lock", async () => {
    const store = setup();
    await expect(claimCommercialPostActivationDueWork({
      workerKey,
      limit: 10,
      lockSeconds: 300,
    }, {
      store,
      now: () => now,
    })).resolves.toEqual({
      ok: true,
      workerKey,
      claimed: 1,
      lockedUntil,
      items: [item()],
    });
    expect(store.claim).toHaveBeenCalledWith({
      workerKey,
      limit: 10,
      now,
      lockedUntil: new Date(lockedUntil),
    });
  });

  it("uses conservative defaults", async () => {
    const store = setup([]);
    await expect(claimCommercialPostActivationDueWork({ workerKey }, {
      store,
      now: () => now,
    })).resolves.toEqual({
      ok: true,
      workerKey,
      claimed: 0,
      lockedUntil,
      items: [],
    });
    expect(store.claim).toHaveBeenCalledWith(expect.objectContaining({
      limit: 25,
      lockedUntil: new Date(lockedUntil),
    }));
  });

  it.each([
    {},
    { workerKey: "invalid worker" },
    { workerKey, limit: 0 },
    { workerKey, limit: 101 },
    { workerKey, lockSeconds: 29 },
    { workerKey, lockSeconds: 1801 },
  ])("rejects invalid input before accessing storage", async (input) => {
    const store = setup();
    await expect(claimCommercialPostActivationDueWork(input, {
      store,
      now: () => now,
    })).resolves.toMatchObject({
      ok: false,
      error: "invalid_input",
    });
    expect(store.claim).not.toHaveBeenCalled();
  });

  it("rejects a claim owned by another worker", async () => {
    const store = setup([item({ lockedBy: "worker:other" })]);
    await expect(claimCommercialPostActivationDueWork({ workerKey }, {
      store,
      now: () => now,
    })).resolves.toMatchObject({
      ok: false,
      error: "invalid_claimed_work",
    });
  });

  it("rejects a claim with a divergent expiration", async () => {
    const store = setup([item({ lockedUntil: "2026-08-23T18:06:00.000Z" })]);
    await expect(claimCommercialPostActivationDueWork({ workerKey }, {
      store,
      now: () => now,
    })).resolves.toMatchObject({
      ok: false,
      error: "invalid_claimed_work",
    });
  });

  it("rejects malformed claimed records", async () => {
    const store = setup([item({ attempts: 0 })]);
    await expect(claimCommercialPostActivationDueWork({ workerKey }, {
      store,
      now: () => now,
    })).resolves.toMatchObject({
      ok: false,
      error: "invalid_claimed_work",
    });
  });

  it("rejects storage results above the requested limit", async () => {
    const store = setup([item(), item({
      id: "63164020-8778-4226-afed-189e8d2333cc",
      milestoneCode: "adoption_d1",
    })]);
    await expect(claimCommercialPostActivationDueWork({
      workerKey,
      limit: 1,
    }, {
      store,
      now: () => now,
    })).resolves.toMatchObject({
      ok: false,
      error: "invalid_claimed_work",
    });
  });

  it("keeps storage failures observable", async () => {
    const failure = new Error("database unavailable");
    const store = setup();
    store.claim.mockRejectedValue(failure);
    await expect(claimCommercialPostActivationDueWork({ workerKey }, {
      store,
      now: () => now,
    })).rejects.toBe(failure);
  });
});
