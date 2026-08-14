import { describe, expect, it, vi } from "vitest";

import { buildCommercialPostActivationFollowUp } from "./commercial-post-activation-follow-up.service";
import { recordCommercialPostActivationObservation } from "./commercial-post-activation-observations.service";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const plan = buildCommercialPostActivationFollowUp({
  onboardingId,
  commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
  companyId: "9af03377-1d22-40be-9460-dbe07b2709d5",
  activatedAt: "2026-08-13T01:00:00.000Z",
  context: { businessType: "clinic", activeChannels: ["meta"], teamSize: 1 },
})!;

const observation = {
  idempotencyKey: `${onboardingId}:welcome:welcome_delivered:message-1`,
  milestoneCode: "welcome" as const,
  indicator: "welcome_delivered",
  value: true,
  observedAt: "2026-08-13T02:00:00.000Z",
  source: { type: "system" as const, id: "outbox-dispatcher" },
};

function setup(overrides: Record<string, unknown> = {}) {
  const tx = {
    findOnboarding: vi.fn().mockResolvedValue({
      onboardingId,
      status: "completed",
      result: { postActivationFollowUpPlan: plan },
      ...overrides,
    }),
    saveResult: vi.fn().mockResolvedValue(undefined),
  };
  const store = { transaction: vi.fn((callback) => callback(tx)) };
  return { tx, store };
}

describe("commercial post-activation observations", () => {
  it("persists a validated observation in the onboarding result", async () => {
    const { tx, store } = setup();
    const result = await recordCommercialPostActivationObservation({
      onboardingId,
      observation,
    }, { store, now: () => new Date("2026-08-13T02:01:00.000Z") });

    expect(result).toEqual({
      ok: true,
      replayed: false,
      onboardingId,
      milestoneCode: "welcome",
      indicator: "welcome_delivered",
      observationCount: 1,
    });
    expect(tx.saveResult).toHaveBeenCalledWith(
      onboardingId,
      expect.objectContaining({ postActivationObservations: [observation] }),
      new Date("2026-08-13T02:01:00.000Z"),
    );
  });

  it("replays the same idempotent observation without writing", async () => {
    const { tx, store } = setup({
      result: {
        postActivationFollowUpPlan: plan,
        postActivationObservations: [observation],
      },
    });

    await expect(recordCommercialPostActivationObservation({
      onboardingId,
      observation,
    }, { store })).resolves.toMatchObject({
      ok: true,
      replayed: true,
      observationCount: 1,
    });
    expect(tx.saveResult).not.toHaveBeenCalled();
  });

  it("rejects conflicting reuse of an idempotency key", async () => {
    const { tx, store } = setup({
      result: {
        postActivationFollowUpPlan: plan,
        postActivationObservations: [observation],
      },
    });

    await expect(recordCommercialPostActivationObservation({
      onboardingId,
      observation: { ...observation, value: false },
    }, { store })).resolves.toMatchObject({
      ok: false,
      error: "observation_conflict",
    });
    expect(tx.saveResult).not.toHaveBeenCalled();
  });

  it("appends observations while preserving history", async () => {
    const previous = { ...observation, idempotencyKey: "previous" };
    const { tx, store } = setup({
      result: {
        postActivationFollowUpPlan: plan,
        postActivationObservations: [previous],
      },
    });

    await recordCommercialPostActivationObservation({ onboardingId, observation }, { store });
    expect(tx.saveResult).toHaveBeenCalledWith(
      onboardingId,
      expect.objectContaining({ postActivationObservations: [previous, observation] }),
      expect.any(Date),
    );
  });

  it("rejects an onboarding that has not completed", async () => {
    const { tx, store } = setup({ status: "in_progress" });
    await expect(recordCommercialPostActivationObservation({
      onboardingId,
      observation,
    }, { store })).resolves.toMatchObject({
      ok: false,
      error: "post_activation_not_available",
    });
    expect(tx.saveResult).not.toHaveBeenCalled();
  });

  it("rejects a missing onboarding", async () => {
    const { tx, store } = setup();
    tx.findOnboarding.mockResolvedValue(null);
    await expect(recordCommercialPostActivationObservation({
      onboardingId,
      observation,
    }, { store })).resolves.toMatchObject({ ok: false, error: "onboarding_not_found" });
  });

  it("rejects a milestone outside the scheduled plan", async () => {
    const reducedPlan = { ...plan, milestones: plan.milestones.filter((item) => item.code !== "adoption_d7") };
    const { store } = setup({ result: { postActivationFollowUpPlan: reducedPlan } });
    await expect(recordCommercialPostActivationObservation({
      onboardingId,
      observation: { ...observation, milestoneCode: "adoption_d7" },
    }, { store })).resolves.toMatchObject({ ok: false, error: "milestone_not_found" });
  });

  it("rejects an invalid saved history", async () => {
    const { store } = setup({
      result: {
        postActivationFollowUpPlan: plan,
        postActivationObservations: [{ invalid: true }],
      },
    });
    await expect(recordCommercialPostActivationObservation({
      onboardingId,
      observation,
    }, { store })).resolves.toMatchObject({
      ok: false,
      error: "invalid_observation_history",
    });
  });

  it("validates input before opening a transaction", async () => {
    const { store } = setup();
    await expect(recordCommercialPostActivationObservation({
      onboardingId: "invalid",
      observation,
    }, { store })).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(store.transaction).not.toHaveBeenCalled();
  });
});
