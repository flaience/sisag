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
  const store = {
    findCursor: vi.fn().mockResolvedValue(null),
    listCompleted: vi.fn().mockResolvedValue({
      candidates,
      cursor: candidates.at(-1)?.onboardingId ?? null,
      wrapped: false,
    }),
  };
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
  const synchronizeDueWork = vi.fn().mockResolvedValue({
    ok: true,
    onboardingId,
    total: 5,
    created: 1,
    updated: 0,
    preserved: 4,
    completed: 0,
  });
  return { store, collectObservations, process, synchronizeDueWork };
}

describe("commercial post-activation due runner", () => {
  it("collects observations and processes a due milestone", async () => {
    const options = setup();
    const result = await runCommercialPostActivationDueMilestones({}, { ...options, now });

    expect(result).toMatchObject({
      ok: true,
      scanned: 1,
      cursor: onboardingId,
      wrapped: false,
      due: 1,
      processed: 1,
      completed: 1,
      failed: 0,
      dueWork: {
        synchronized: 1,
        failed: 0,
        created: 1,
        updated: 0,
        preserved: 4,
        completed: 0,
        failures: [],
      },
    });
    expect(options.synchronizeDueWork).toHaveBeenCalledWith({
      onboardingId,
      plan: plan(onboardingId),
      executions: [],
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
      synchronizeDueWork: options.synchronizeDueWork,
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
    expect(options.store.findCursor).toHaveBeenCalledOnce();
    expect(options.store.listCompleted).toHaveBeenCalledWith(7, undefined);
  });

  it("lets an explicit cursor override the durable checkpoint", async () => {
    const options = setup([]);
    options.store.listCompleted.mockResolvedValue({
      candidates: [candidate(secondOnboardingId)],
      cursor: secondOnboardingId,
      wrapped: true,
    });

    await expect(runCommercialPostActivationDueMilestones({
      limit: 7,
      cursor: onboardingId,
    }, { ...options, now })).resolves.toMatchObject({
      ok: true,
      scanned: 1,
      cursor: secondOnboardingId,
      wrapped: true,
    });
    expect(options.store.findCursor).not.toHaveBeenCalled();
    expect(options.store.listCompleted).toHaveBeenCalledWith(7, onboardingId);
  });

  it("continues from the latest cursor-bearing durable checkpoint", async () => {
    const options = setup([]);
    options.store.findCursor.mockResolvedValue(onboardingId);
    options.store.listCompleted.mockResolvedValue({
      candidates: [candidate(secondOnboardingId)],
      cursor: secondOnboardingId,
      wrapped: false,
    });

    await expect(runCommercialPostActivationDueMilestones(
      { limit: 7 },
      { ...options, now },
    )).resolves.toMatchObject({
      ok: true,
      cursor: secondOnboardingId,
    });
    expect(options.store.listCompleted).toHaveBeenCalledWith(7, onboardingId);
  });

  it("rejects invalid input before querying", async () => {
    const options = setup();
    await expect(runCommercialPostActivationDueMilestones(
      { limit: 0 },
      options,
    )).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(options.store.listCompleted).not.toHaveBeenCalled();
    expect(options.store.findCursor).not.toHaveBeenCalled();
  });

  it("aggregates shadow due-work synchronization for the scanned batch", async () => {
    const options = setup([candidate(), candidate(secondOnboardingId)]);
    options.synchronizeDueWork
      .mockResolvedValueOnce({
        ok: true,
        onboardingId,
        total: 5,
        created: 2,
        updated: 1,
        preserved: 2,
        completed: 1,
      })
      .mockResolvedValueOnce({
        ok: true,
        onboardingId: secondOnboardingId,
        total: 5,
        created: 5,
        updated: 0,
        preserved: 0,
        completed: 0,
      });

    await expect(runCommercialPostActivationDueMilestones({}, {
      ...options,
      now,
    })).resolves.toMatchObject({
      dueWork: {
        synchronized: 2,
        failed: 0,
        created: 7,
        updated: 1,
        preserved: 2,
        completed: 1,
        failures: [],
      },
    });
  });

  it("isolates shadow synchronization failures from milestone processing", async () => {
    const options = setup([candidate(), candidate(secondOnboardingId)]);
    options.synchronizeDueWork
      .mockResolvedValueOnce({
        ok: false,
        error: "invalid_plan_state",
        message: "inconsistent",
      })
      .mockRejectedValueOnce(new Error("queue unavailable"));

    const result = await runCommercialPostActivationDueMilestones({}, {
      ...options,
      now,
    });
    expect(result).toMatchObject({
      processed: 2,
      failed: 0,
      dueWork: {
        synchronized: 0,
        failed: 2,
        failures: [
          { onboardingId, error: "invalid_plan_state" },
          { onboardingId: secondOnboardingId, error: "queue unavailable" },
        ],
      },
    });
    expect(options.process).toHaveBeenCalledTimes(2);
  });

  it("combines persisted observations with operational signals", async () => {
    const options = setup([candidate(onboardingId, {
      postActivationMilestoneExecutions: [{
        milestoneCode: "welcome",
        outcome: "completed",
        processedAt: "2026-08-13T02:00:00.000Z",
      }],
    })]);
    const collectOperationalSignals = vi.fn().mockResolvedValue({
      scheduling_activity: true,
      active_channel_health: true,
    });
    options.collectObservations.mockResolvedValue({ first_login: true });

    await runCommercialPostActivationDueMilestones({}, {
      ...options,
      collectOperationalSignals,
      now: () => new Date("2026-08-15T02:00:00.000Z"),
    });

    expect(collectOperationalSignals).toHaveBeenCalledWith({
      companyId: "9af03377-1d22-40be-9460-dbe07b2709d5",
      activatedAt: "2026-08-13T01:00:00.000Z",
      milestoneCode: "adoption_d1",
      expectedTeamSize: 1,
    });
    expect(options.process).toHaveBeenCalledWith({
      onboardingId,
      observations: {
        first_login: true,
        scheduling_activity: true,
        active_channel_health: true,
      },
    });
  });

  it("uses the current operational truth over an older persisted value", async () => {
    const options = setup([candidate(onboardingId, {
      postActivationMilestoneExecutions: [{
        milestoneCode: "welcome",
        outcome: "completed",
        processedAt: "2026-08-13T02:00:00.000Z",
      }],
    })]);
    options.collectObservations.mockResolvedValue({ scheduling_activity: false });

    await runCommercialPostActivationDueMilestones({}, {
      ...options,
      collectOperationalSignals: vi.fn().mockResolvedValue({ scheduling_activity: true }),
      now: () => new Date("2026-08-15T02:00:00.000Z"),
    });

    expect(options.process).toHaveBeenCalledWith({
      onboardingId,
      observations: { scheduling_activity: true },
    });
  });

  it("does not collect operational signals for human-evidence milestones", async () => {
    const options = setup();
    const collectOperationalSignals = vi.fn();

    await runCommercialPostActivationDueMilestones({}, {
      ...options,
      collectOperationalSignals,
      now,
    });

    expect(collectOperationalSignals).not.toHaveBeenCalled();
  });

  it("isolates operational collection failures", async () => {
    const options = setup([candidate(onboardingId, {
      postActivationMilestoneExecutions: [{
        milestoneCode: "welcome",
        outcome: "completed",
        processedAt: "2026-08-13T02:00:00.000Z",
      }],
    })]);

    await expect(runCommercialPostActivationDueMilestones({}, {
      ...options,
      collectOperationalSignals: vi.fn().mockRejectedValue(new Error("metrics unavailable")),
      now: () => new Date("2026-08-15T02:00:00.000Z"),
    })).resolves.toMatchObject({
      ok: true,
      processed: 0,
      failed: 1,
      failures: [{ onboardingId, error: "metrics unavailable" }],
    });
    expect(options.process).not.toHaveBeenCalled();
  });
});
