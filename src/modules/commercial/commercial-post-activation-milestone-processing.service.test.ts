import { describe, expect, it, vi } from "vitest";

import { buildCommercialPostActivationFollowUp } from "./commercial-post-activation-follow-up.service";
import { processCommercialPostActivationMilestone } from "./commercial-post-activation-milestone-processing.service";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const plan = buildCommercialPostActivationFollowUp({
  onboardingId,
  commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
  companyId: "9af03377-1d22-40be-9460-dbe07b2709d5",
  activatedAt: "2026-08-13T01:01:46.809Z",
  context: { businessType: "clinic", activeChannels: ["meta"], teamSize: 1 },
})!;

function setup(result: Record<string, unknown> = { postActivationFollowUpPlan: plan }) {
  const tx = {
    findOnboarding: vi.fn().mockResolvedValue({ onboardingId, result }),
    saveResult: vi.fn().mockResolvedValue(undefined),
    emit: vi.fn().mockResolvedValue(true),
  };
  const store = { transaction: vi.fn((callback) => callback(tx)) };
  return { tx, store };
}

const now = () => new Date("2026-08-13T02:00:00.000Z");

describe("commercial post-activation milestone processing", () => {
  it("persists completion and its event atomically", async () => {
    const { tx, store } = setup({
      outcome: "activated",
      postActivationFollowUpPlan: plan,
    });

    const result = await processCommercialPostActivationMilestone({
      onboardingId,
      observations: {
        welcome_delivered: true,
        support_channel_confirmed: true,
      },
    }, { store, now });

    expect(result).toMatchObject({
      ok: true,
      decision: "completed",
      milestoneCode: "welcome",
      emittedEvents: ["commercial.post_activation.milestone_completed"],
    });
    expect(tx.saveResult).toHaveBeenCalledWith(
      onboardingId,
      expect.objectContaining({
        outcome: "activated",
        postActivationMilestoneExecutions: [{
          milestoneCode: "welcome",
          outcome: "completed",
          processedAt: "2026-08-13T02:00:00.000Z",
        }],
      }),
      expect.any(Date),
    );
    expect(tx.emit).toHaveBeenCalledWith(expect.objectContaining({
      eventType: "commercial.post_activation.milestone_completed",
      dedupeKey: `commercial.post_activation.milestone_completed:${plan.key}:welcome`,
    }));
  });

  it("persists human escalation as a processed milestone", async () => {
    const { tx, store } = setup();
    const result = await processCommercialPostActivationMilestone({
      onboardingId,
      observations: { welcome_delivery_failed: true },
    }, { store, now });

    expect(result).toMatchObject({
      ok: true,
      decision: "human_escalation",
      activeEscalations: ["welcome_delivery_failed"],
      emittedEvents: ["commercial.post_activation.human_escalation_requested"],
    });
    expect(tx.saveResult).toHaveBeenCalledWith(
      onboardingId,
      expect.objectContaining({
        postActivationMilestoneExecutions: [expect.objectContaining({ outcome: "escalated" })],
      }),
      expect.any(Date),
    );
  });

  it("does not write while waiting", async () => {
    const { tx, store } = setup();
    const result = await processCommercialPostActivationMilestone({
      onboardingId,
      observations: {},
    }, { store, now });

    expect(result).toMatchObject({ ok: true, decision: "wait", milestoneCode: "welcome" });
    expect(tx.saveResult).not.toHaveBeenCalled();
    expect(tx.emit).not.toHaveBeenCalled();
  });

  it("returns replay when the entire plan was processed", async () => {
    const executions = plan.milestones.map((milestone) => ({
      milestoneCode: milestone.code,
      outcome: "completed",
      processedAt: milestone.dueAt,
    }));
    const { tx, store } = setup({
      postActivationFollowUpPlan: plan,
      postActivationMilestoneExecutions: executions,
    });

    await expect(processCommercialPostActivationMilestone(
      { onboardingId },
      { store, now },
    )).resolves.toMatchObject({
      ok: true,
      replayed: true,
      decision: "plan_completed",
      milestoneCode: null,
      emittedEvents: [],
    });
    expect(tx.saveResult).not.toHaveBeenCalled();
  });

  it("rejects a missing onboarding", async () => {
    const { tx, store } = setup();
    tx.findOnboarding.mockResolvedValue(null);
    await expect(processCommercialPostActivationMilestone(
      { onboardingId },
      { store },
    )).resolves.toMatchObject({ ok: false, error: "onboarding_not_found" });
  });

  it("rejects an onboarding without a scheduled plan", async () => {
    const { store } = setup({});
    await expect(processCommercialPostActivationMilestone(
      { onboardingId },
      { store },
    )).resolves.toMatchObject({ ok: false, error: "follow_up_not_scheduled" });
  });

  it("rejects a corrupted execution history", async () => {
    const { store } = setup({
      postActivationFollowUpPlan: plan,
      postActivationMilestoneExecutions: [{ outcome: "unknown" }],
    });
    await expect(processCommercialPostActivationMilestone(
      { onboardingId },
      { store },
    )).resolves.toMatchObject({ ok: false, error: "invalid_follow_up_state" });
  });

  it("validates input before opening a transaction", async () => {
    const { store } = setup();
    await expect(processCommercialPostActivationMilestone(
      { onboardingId: "invalid" },
      { store },
    )).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(store.transaction).not.toHaveBeenCalled();
  });

  it("does not report an event when the dedupe insert already exists", async () => {
    const { tx, store } = setup();
    tx.emit.mockResolvedValue(false);
    await expect(processCommercialPostActivationMilestone({
      onboardingId,
      observations: {
        welcome_delivered: true,
        support_channel_confirmed: true,
      },
    }, { store, now })).resolves.toMatchObject({
      ok: true,
      decision: "completed",
      emittedEvents: [],
    });
  });
});
