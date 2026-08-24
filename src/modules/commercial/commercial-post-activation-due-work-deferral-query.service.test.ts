import { describe, expect, it, vi } from "vitest";

import { listCommercialPostActivationDueWorkDeferrals } from "./commercial-post-activation-due-work-deferral-query.service";

const now = new Date("2026-08-24T20:30:00.000Z");
const workId = "53164020-8778-4226-afed-189e8d2333cc";
const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";

function item(overrides: Record<string, unknown> = {}) {
  return {
    workId,
    onboardingId,
    milestoneCode: "adoption_d1",
    status: "scheduled",
    deferredCount: 10,
    firstDeferredAt: "2026-08-24T18:30:00.000Z",
    lastDeferredAt: "2026-08-24T20:15:00.000Z",
    lastDeferralReason: "business_wait",
    escalationRequired: false,
    availableAt: "2026-08-24T20:45:00.000Z",
    ...overrides,
  };
}

function setup(value: Record<string, unknown> = {}) {
  return {
    read: vi.fn().mockResolvedValue({
      total: 1,
      waiting: 1,
      escalated: 0,
      filteredTotal: 1,
      items: [item()],
      ...value,
    }),
  };
}

describe("commercial post-activation due work deferral query", () => {
  it("projects bounded operational wait timing", async () => {
    const store = setup();
    await expect(listCommercialPostActivationDueWorkDeferrals({}, {
      store,
      now: () => now,
    })).resolves.toEqual({
      ok: true,
      data: {
        recordedAt: "2026-08-24T20:30:00.000Z",
        status: "degraded",
        total: 1,
        waiting: 1,
        escalated: 0,
        filteredTotal: 1,
        limit: 25,
        offset: 0,
        hasNext: false,
        items: [{
          ...item(),
          waitAgeSeconds: 7200,
          waitDeadlineAt: "2026-08-25T18:30:00.000Z",
          waitRemainingSeconds: 79200,
          nextAvailableInSeconds: 900,
        }],
      },
    });
    expect(store.read).toHaveBeenCalledWith({ state: "all", limit: 25, offset: 0 });
  });

  it("marks escalated work as critical", async () => {
    const store = setup({
      waiting: 0,
      escalated: 1,
      items: [item({
        deferredCount: 96,
        lastDeferralReason: "deferral_limit_reached",
        escalationRequired: true,
      })],
    });
    await expect(listCommercialPostActivationDueWorkDeferrals({}, {
      store,
      now: () => now,
    })).resolves.toMatchObject({
      ok: true,
      data: { status: "critical", escalated: 1 },
    });
  });

  it("reports an empty set as healthy", async () => {
    const store = setup({
      total: 0,
      waiting: 0,
      filteredTotal: 0,
      items: [],
    });
    await expect(listCommercialPostActivationDueWorkDeferrals({}, {
      store,
      now: () => now,
    })).resolves.toMatchObject({
      ok: true,
      data: { status: "healthy", total: 0, items: [] },
    });
  });

  it("applies state filters and pagination", async () => {
    const store = setup({ filteredTotal: 40, items: [item()] });
    const result = await listCommercialPostActivationDueWorkDeferrals({
      state: "escalated",
      limit: 10,
      offset: 20,
    }, { store, now: () => now });
    expect(store.read).toHaveBeenCalledWith({ state: "escalated", limit: 10, offset: 20 });
    expect(result).toMatchObject({
      ok: true,
      data: { filteredTotal: 40, limit: 10, offset: 20, hasNext: true },
    });
  });

  it("clamps elapsed and remaining timing at zero", async () => {
    const store = setup({
      items: [item({
        firstDeferredAt: "2026-08-24T21:00:00.000Z",
        availableAt: "2026-08-24T20:00:00.000Z",
      })],
    });
    await expect(listCommercialPostActivationDueWorkDeferrals({}, {
      store,
      now: () => now,
    })).resolves.toMatchObject({
      ok: true,
      data: { items: [{ waitAgeSeconds: 0, nextAvailableInSeconds: 0 }] },
    });
  });

  it.each([
    { state: "invalid" },
    { limit: 0 },
    { limit: 101 },
    { offset: -1 },
  ])("rejects invalid filters", async (input) => {
    const store = setup();
    await expect(listCommercialPostActivationDueWorkDeferrals(input, { store }))
      .resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(store.read).not.toHaveBeenCalled();
  });

  it("rejects inconsistent aggregate counters", async () => {
    const store = setup({ total: 3 });
    await expect(listCommercialPostActivationDueWorkDeferrals({}, { store }))
      .resolves.toMatchObject({ ok: false, error: "invalid_snapshot" });
  });

  it("rejects invalid stored items", async () => {
    const store = setup({ items: [item({ deferredCount: 0 })] });
    await expect(listCommercialPostActivationDueWorkDeferrals({}, { store }))
      .resolves.toMatchObject({ ok: false, error: "invalid_snapshot" });
  });

  it("keeps storage failures observable", async () => {
    const failure = new Error("database unavailable");
    const store = setup();
    store.read.mockRejectedValue(failure);
    await expect(listCommercialPostActivationDueWorkDeferrals({}, { store }))
      .rejects.toBe(failure);
  });
});
