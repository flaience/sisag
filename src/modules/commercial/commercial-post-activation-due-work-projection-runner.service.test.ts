import { describe, expect, it, vi } from "vitest";

import { projectCommercialPostActivationDueWork } from "./commercial-post-activation-due-work-projection-runner.service";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const secondOnboardingId = "33164020-8778-4226-afed-189e8d2333cc";

function candidate(id = onboardingId) {
  return {
    onboardingId: id,
    result: {
      postActivationFollowUpPlan: { onboardingId: id, milestones: [] },
      postActivationMilestoneExecutions: [{ milestoneCode: "welcome" }],
    },
  };
}

function setup(candidates = [candidate()]) {
  const store = {
    findCursor: vi.fn().mockResolvedValue(null),
    listCompleted: vi.fn().mockResolvedValue({
      candidates,
      cursor: candidates.at(-1)?.onboardingId ?? null,
      wrapped: false,
    }),
  };
  const synchronizeDueWork = vi.fn().mockResolvedValue({
    ok: true,
    onboardingId,
    total: 5,
    created: 1,
    updated: 1,
    preserved: 2,
    completed: 1,
  });
  return { store, synchronizeDueWork };
}

describe("commercial post-activation due work projection runner", () => {
  it("projects completed onboardings without executing milestones", async () => {
    const options = setup();

    await expect(projectCommercialPostActivationDueWork({}, options)).resolves.toEqual({
      ok: true,
      scanned: 1,
      cursor: onboardingId,
      wrapped: false,
      synchronized: 1,
      failed: 0,
      created: 1,
      updated: 1,
      preserved: 2,
      completed: 1,
      failures: [],
    });
    expect(options.synchronizeDueWork).toHaveBeenCalledWith({
      onboardingId,
      plan: { onboardingId, milestones: [] },
      executions: [{ milestoneCode: "welcome" }],
    });
  });

  it("aggregates synchronization results across the batch", async () => {
    const options = setup([candidate(), candidate(secondOnboardingId)]);
    options.synchronizeDueWork
      .mockResolvedValueOnce({
        ok: true, onboardingId, total: 5, created: 2, updated: 0,
        preserved: 2, completed: 1,
      })
      .mockResolvedValueOnce({
        ok: true, onboardingId: secondOnboardingId, total: 5, created: 0,
        updated: 1, preserved: 4, completed: 0,
      });

    await expect(projectCommercialPostActivationDueWork({}, options)).resolves.toMatchObject({
      ok: true,
      scanned: 2,
      synchronized: 2,
      failed: 0,
      created: 2,
      updated: 1,
      preserved: 6,
      completed: 1,
    });
  });

  it("isolates domain failures and continues projecting", async () => {
    const options = setup([candidate(), candidate(secondOnboardingId)]);
    options.synchronizeDueWork
      .mockResolvedValueOnce({ ok: false, error: "invalid_plan", message: "invalid" })
      .mockResolvedValueOnce({
        ok: true, onboardingId: secondOnboardingId, total: 5, created: 0,
        updated: 0, preserved: 5, completed: 0,
      });

    await expect(projectCommercialPostActivationDueWork({}, options)).resolves.toMatchObject({
      ok: true,
      scanned: 2,
      synchronized: 1,
      failed: 1,
      failures: [{ onboardingId, error: "invalid_plan" }],
    });
    expect(options.synchronizeDueWork).toHaveBeenCalledTimes(2);
  });

  it("isolates unexpected storage failures from one candidate", async () => {
    const options = setup([candidate(), candidate(secondOnboardingId)]);
    options.synchronizeDueWork
      .mockRejectedValueOnce(new Error("database unavailable"))
      .mockResolvedValueOnce({
        ok: true, onboardingId: secondOnboardingId, total: 5, created: 0,
        updated: 0, preserved: 5, completed: 0,
      });

    await expect(projectCommercialPostActivationDueWork({}, options)).resolves.toMatchObject({
      ok: true,
      synchronized: 1,
      failed: 1,
      failures: [{ onboardingId, error: "database unavailable" }],
    });
  });

  it("uses the durable cursor by default", async () => {
    const options = setup([]);
    options.store.findCursor.mockResolvedValue(onboardingId);

    await projectCommercialPostActivationDueWork({ limit: 7 }, options);

    expect(options.store.listCompleted).toHaveBeenCalledWith(7, onboardingId);
  });

  it("lets an explicit cursor override the durable cursor", async () => {
    const options = setup([]);

    await projectCommercialPostActivationDueWork({ cursor: secondOnboardingId }, options);

    expect(options.store.findCursor).not.toHaveBeenCalled();
    expect(options.store.listCompleted).toHaveBeenCalledWith(25, secondOnboardingId);
  });

  it("rejects malformed input before reading storage", async () => {
    const options = setup([]);

    await expect(projectCommercialPostActivationDueWork({ limit: 0 }, options))
      .resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(options.store.findCursor).not.toHaveBeenCalled();
    expect(options.store.listCompleted).not.toHaveBeenCalled();
    expect(options.synchronizeDueWork).not.toHaveBeenCalled();
  });
});
