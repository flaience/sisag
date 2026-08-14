import { describe, expect, it, vi } from "vitest";

import { buildCommercialPostActivationFollowUp } from "./commercial-post-activation-follow-up.service";
import { runCommercialPostActivationDueMilestones } from "./commercial-post-activation-due-runner.service";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const secondOnboardingId = "33164020-8778-4226-afed-189e8d2333cc";

function plan(id = onboardingId) {
  return buildCommercialPostActivationFollowUp({
    onboardingId: id,
    commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
    companyId: "9af03377-1d22-40be-9460-dbe07b2709d5",
    activatedAt: "2026-08-13T01:00:00.000Z",
    context: { businessType: "clinic", activeChannels: ["meta"], teamSize: 1 },
  })!;
}

function candidate(id = onboardingId, result: Record<string, unknown> = {}) {
  return {
    onboardingId: id,
    result: { postActivationFollowUpPlan: plan(id), ...result },
  };
}

const now = () => new Date("2026-08-14T02:00:00.000Z");

function setup(candidates = [candidate()]) {
  const store = { listCompleted: vi.fn().mockResolvedValue(candidates) };
  const collectObservations = vi.fn().mockResolvedValue({ first_login: true });
  const process = vi.fn().mockResolvedValue({
    ok: true,
    replayed: false,
    decision: "completed",
    onboardingId,
    milestoneCode: "welcome",
    missingIndicators: [],
    activeEscalations: [],
    emittedEvents: ["commercial.post_activation.milestone_completed"],
  });
  return { store, collectObservations, process };
}

describe("commercial post-activation due runner", () => {
  it("collects observations and processes a due milestone", async () => {
    const options = setup();
    const result = await runCommercialPostActivationDueMilestones({}, { ...options, now });

    expect(result).toMatchObject({
      ok: true,
      scanned: 1,
      due: 1,
      processed: 1,
      completed: 1,
      failed: 0,
    });
    expect(options.collectObservations).toHaveBeenCalledWith({
      onboardingId,
      milestoneCode: "welcome",
    });
    expect(options.process).toHaveBeenCalledWith({
      onboardingId,
      observations: { first_login: true },
    });
  });

  it("uses persisted observations with the default collector", async () => {
    const storedObservation = {
      idempotencyKey: "welcome-delivered-1",
      milestoneCode: "welcome",
      indicator: "welcome_delivered",
      value: true,
      observedAt: "2026-08-13T02:00:00.000Z",
      source: { type: "system", id: "test" },
    };
    const options = setup([candidate(onboardingId, {
      postActivationObservations: [storedObservation],
    })]);

    const result = await runCommercialPostActivationDueMilestones({}, {
      store: options.store,
      process: options.process,
      now,
    });

    expect(result).toMatchObject({ ok: true, due: 1, processed: 1 });
    expect(options.process).toHaveBeenCalledWith({
      onboardingId,
      observations: { welcome_delivered: true },
    });
  });

  it("isolates an invalid persisted observation history", async () => {
    const options = setup([
      candidate(onboardingId, { postActivationObservations: [{ invalid: true }] }),
      candidate(secondOnboardingId, { postActivationObservations: [] }),
    ]);
    options.process.mockResolvedValue({
      ok: true,
      replayed: false,
      decision: "wait",
      onboardingId: secondOnboardingId,
      milestoneCode: "welcome",
      missingIndicators: ["welcome_delivered"],
      activeEscalations: [],
      emittedEvents: [],
    });

    const result = await runCommercialPostActivationDueMilestones({}, {
      store: options.store,
      process: options.process,
      now,
    });
    expect(result).toMatchObject({
      ok: true,
      due: 2,
      processed: 1,
      waiting: 1,
      failed: 1,
      failures: [{ onboardingId, error: "invalid_observation_history" }],
    });
    expect(options.process).toHaveBeenCalledTimes(1);
  });

  it("skips candidates whose next milestone is not due", async () => {
    const options = setup();
    const result = await runCommercialPostActivationDueMilestones({}, {
      ...options,
      now: () => new Date("2026-08-12T00:00:00.000Z"),
    });

    expect(result).toMatchObject({ ok: true, scanned: 1, due: 0, processed: 0 });
    expect(options.collectObservations).not.toHaveBeenCalled();
    expect(options.process).not.toHaveBeenCalled();
  });

  it("selects the first unprocessed milestone", async () => {
    const options = setup([candidate(onboardingId, {
      postActivationMilestoneExecutions: [{
        milestoneCode: "welcome",
        outcome: "completed",
        processedAt: "2026-08-13T02:00:00.000Z",
      }],
    })]);

    await runCommercialPostActivationDueMilestones({}, { ...options, now });
    expect(options.collectObservations).toHaveBeenCalledWith({
      onboardingId,
      milestoneCode: "adoption_d1",
    });
  });

  it("isolates failures and continues processing the batch", async () => {
    const options = setup([candidate(), candidate(secondOnboardingId)]);
    options.collectObservations
      .mockRejectedValueOnce(new Error("collector unavailable"))
      .mockResolvedValueOnce({});
    options.process.mockResolvedValueOnce({
      ok: true,
      replayed: false,
      decision: "wait",
      onboardingId: secondOnboardingId,
      milestoneCode: "welcome",
      missingIndicators: ["welcome_delivered"],
      activeEscalations: [],
      emittedEvents: [],
    });

    const result = await runCommercialPostActivationDueMilestones({}, { ...options, now });
    expect(result).toMatchObject({
      ok: true,
      scanned: 2,
      due: 2,
      processed: 1,
      waiting: 1,
      failed: 1,
      failures: [{ onboardingId, error: "collector unavailable" }],
    });
    expect(options.process).toHaveBeenCalledTimes(1);
  });

  it("reports processor domain errors without aborting", async () => {
    const options = setup();
    options.process.mockResolvedValue({
      ok: false,
      error: "invalid_follow_up_state",
      message: "invalid state",
    });

    await expect(runCommercialPostActivationDueMilestones({}, {
      ...options,
      now,
    })).resolves.toMatchObject({
      ok: true,
      processed: 0,
      failed: 1,
      failures: [{ onboardingId, error: "invalid_follow_up_state" }],
    });
  });

  it("ignores malformed plans and completed plans", async () => {
    const completed = plan(secondOnboardingId);
    const executions = completed.milestones.map((milestone) => ({
      milestoneCode: milestone.code,
      outcome: "completed",
      processedAt: milestone.dueAt,
    }));
    const options = setup([
      { onboardingId, result: { postActivationFollowUpPlan: { invalid: true } } },
      candidate(secondOnboardingId, { postActivationMilestoneExecutions: executions }),
    ]);

    await expect(runCommercialPostActivationDueMilestones({}, {
      ...options,
      now,
    })).resolves.toMatchObject({ ok: true, scanned: 2, due: 0 });
  });

  it("enforces the batch limit before querying", async () => {
    const options = setup([]);
    await runCommercialPostActivationDueMilestones({ limit: 7 }, options);
    expect(options.store.listCompleted).toHaveBeenCalledWith(7);
  });

  it("rejects invalid input before querying", async () => {
    const options = setup();
    await expect(runCommercialPostActivationDueMilestones(
      { limit: 0 },
      options,
    )).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(options.store.listCompleted).not.toHaveBeenCalled();
  });
});
