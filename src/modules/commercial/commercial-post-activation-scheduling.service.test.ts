import { describe, expect, it, vi } from "vitest";

import { scheduleCommercialPostActivation } from "./commercial-post-activation-scheduling.service";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const input = {
  onboardingId,
  companyId: "9af03377-1d22-40be-9460-dbe07b2709d5",
  context: { businessType: "clinic", activeChannels: ["meta"], teamSize: 1 },
  scheduledBy: { type: "system" as const, id: "post-activation-agent" },
};

type ActivationOverrides = Partial<{
  onboardingStatus: "pending" | "in_progress" | "blocked" | "completed" | "cancelled";
  clientStatus: "prospect" | "onboarding" | "active" | "suspended" | "closed";
  completedAt: Date | null;
  result: Record<string, unknown>;
}>;

function setup(overrides: ActivationOverrides = {}) {
  const activation = {
    onboardingId,
    commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
    onboardingStatus: "completed",
    clientStatus: "active",
    completedAt: new Date("2026-08-13T01:01:46.809Z"),
    result: { outcome: "activated" },
    ...overrides,
  };
  const tx = {
    findActivation: vi.fn().mockResolvedValue(activation),
    savePlan: vi.fn().mockResolvedValue(undefined),
    emit: vi.fn().mockResolvedValue(true),
  };
  const store = { transaction: vi.fn((callback) => callback(tx)) };
  return { tx, store };
}

describe("commercial post-activation scheduling", () => {
  it("persists the plan and event atomically", async () => {
    const { tx, store } = setup();
    const result = await scheduleCommercialPostActivation(input, {
      store, now: () => new Date("2026-08-13T02:00:00.000Z"),
    });
    expect(result).toMatchObject({
      ok: true, replayed: false, milestoneCount: 5,
      supportWindowEndsAt: "2026-08-27T01:01:46.809Z",
      emittedEvents: ["commercial.post_activation.follow_up_scheduled"],
    });
    expect(tx.savePlan).toHaveBeenCalledWith(
      onboardingId,
      expect.objectContaining({ outcome: "activated", postActivationFollowUpPlan: expect.any(Object) }),
      expect.any(Date),
    );
    expect(tx.emit).toHaveBeenCalledWith(expect.objectContaining({
      dedupeKey: `commercial.post_activation.follow_up_scheduled:${onboardingId}:post_activation:2026-08-v1`,
    }));
  });

  it("replays an existing versioned plan without writes", async () => {
    const key = `${onboardingId}:post_activation:2026-08-v1`;
    const { tx, store } = setup({ result: { postActivationFollowUpPlan: { key } } });
    await expect(scheduleCommercialPostActivation(input, { store })).resolves.toMatchObject({
      ok: true, replayed: true, planKey: key, emittedEvents: [],
    });
    expect(tx.savePlan).not.toHaveBeenCalled();
    expect(tx.emit).not.toHaveBeenCalled();
  });

  it.each([
    { onboardingStatus: "in_progress" },
    { clientStatus: "onboarding" },
    { completedAt: null },
  ])("rejects an unavailable activation: %j", async (overrides) => {
    const { tx, store } = setup(overrides);
    await expect(scheduleCommercialPostActivation(input, { store })).resolves.toMatchObject({
      ok: false, error: "activation_not_available",
    });
    expect(tx.savePlan).not.toHaveBeenCalled();
  });

  it("reports a missing onboarding", async () => {
    const { tx, store } = setup();
    tx.findActivation.mockResolvedValue(null);
    await expect(scheduleCommercialPostActivation(input, { store })).resolves.toMatchObject({
      ok: false, error: "onboarding_not_found",
    });
  });

  it("validates before opening the transaction", async () => {
    const { store } = setup();
    await expect(scheduleCommercialPostActivation({ ...input, companyId: "invalid" }, { store }))
      .resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(store.transaction).not.toHaveBeenCalled();
  });

  it("does not report an event when the dedupe insert already exists", async () => {
    const { tx, store } = setup();
    tx.emit.mockResolvedValue(false);
    await expect(scheduleCommercialPostActivation(input, { store })).resolves.toMatchObject({
      ok: true, replayed: false, emittedEvents: [],
    });
  });
});
