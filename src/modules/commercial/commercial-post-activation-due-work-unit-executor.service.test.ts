import { describe, expect, it, vi } from "vitest";

import { executeCommercialPostActivationDueWork } from "./commercial-post-activation-due-work-unit-executor.service";

const input = {
  workId: "53164020-8778-4226-afed-189e8d2333cc",
  workerKey: "worker:saopaulo-1",
  onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
  milestoneCode: "welcome",
};

const plan = {
  onboardingId: input.onboardingId,
  companyId: "9af03377-1d22-40be-9460-dbe07b2709d5",
  activatedAt: "2026-08-13T01:01:46.809Z",
  context: { teamSize: 2 },
  milestones: [{ code: "welcome" }, { code: "adoption_d1" }],
};

function setup(result: Record<string, unknown> | null = {
  postActivationFollowUpPlan: plan,
  postActivationObservations: [{
    idempotencyKey: "welcome:welcome_delivered:2026-08-13T02:00:00.000Z",
    milestoneCode: "welcome",
    indicator: "welcome_delivered",
    value: true,
    observedAt: "2026-08-13T02:00:00.000Z",
    source: {
      type: "system",
      id: "post_activation_due_work_unit_executor_test",
    },
  }],
}) {
  return {
    store: { find: vi.fn().mockResolvedValue(result) },
    process: vi.fn().mockResolvedValue({
      ok: true,
      replayed: false,
      decision: "completed",
      onboardingId: input.onboardingId,
      milestoneCode: input.milestoneCode,
      missingIndicators: [],
      activeEscalations: [],
      emittedEvents: ["commercial.post_activation.milestone_completed"],
    }),
    collectOperationalSignals: vi.fn().mockResolvedValue({}),
  };
}

describe("commercial post-activation due work unit executor", () => {
  it("executes exactly the claimed milestone and completes its settlement", async () => {
    const options = setup();
    await expect(executeCommercialPostActivationDueWork(input, options)).resolves.toMatchObject({
      ok: true,
      workId: input.workId,
      workerKey: input.workerKey,
      milestoneCode: "welcome",
      decision: "completed",
      settlementOutcome: "completed",
      deferSeconds: null,
    });
    expect(options.process).toHaveBeenCalledWith({
      onboardingId: input.onboardingId,
      expectedMilestoneCode: "welcome",
      observations: { welcome_delivered: true },
    });
    expect(options.collectOperationalSignals).not.toHaveBeenCalled();
  });

  it("defers a business wait without turning it into a technical failure", async () => {
    const options = setup();
    options.process.mockResolvedValue({
      ok: true,
      replayed: false,
      decision: "wait",
      onboardingId: input.onboardingId,
      milestoneCode: "welcome",
      missingIndicators: ["support_channel_confirmed"],
      activeEscalations: [],
      emittedEvents: [],
    });
    await expect(executeCommercialPostActivationDueWork(input, options)).resolves.toMatchObject({
      ok: true,
      settlementOutcome: "deferred",
      deferSeconds: 900,
      missingIndicators: ["support_channel_confirmed"],
    });
  });

  it("adds operational signals only to adoption milestones", async () => {
    const options = setup({ postActivationFollowUpPlan: plan });
    options.collectOperationalSignals.mockResolvedValue({ appointment_flow_used: true });
    await executeCommercialPostActivationDueWork({ ...input, milestoneCode: "adoption_d1" }, options);
    expect(options.collectOperationalSignals).toHaveBeenCalledWith({
      companyId: plan.companyId,
      activatedAt: plan.activatedAt,
      milestoneCode: "adoption_d1",
      expectedTeamSize: 2,
    });
    expect(options.process).toHaveBeenCalledWith(expect.objectContaining({
      expectedMilestoneCode: "adoption_d1",
      observations: { appointment_flow_used: true },
    }));
  });

  it.each([
    {},
    { ...input, workId: "invalid" },
    { ...input, workerKey: "invalid worker" },
    { ...input, milestoneCode: "Welcome inválido" },
  ])("rejects malformed input before storage", async (invalid) => {
    const options = setup();
    await expect(executeCommercialPostActivationDueWork(invalid, options))
      .resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(options.store.find).not.toHaveBeenCalled();
  });

  it("rejects an invalid deferral policy before storage", async () => {
    const options = setup();
    await expect(executeCommercialPostActivationDueWork(input, {
      ...options, deferSeconds: 29,
    })).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(options.store.find).not.toHaveBeenCalled();
  });

  it("rejects missing or inconsistent onboarding state", async () => {
    const missing = setup(null);
    await expect(executeCommercialPostActivationDueWork(input, missing))
      .resolves.toMatchObject({ ok: false, error: "onboarding_not_found" });

    const inconsistent = setup({
      postActivationFollowUpPlan: { ...plan, onboardingId: input.workId },
    });
    await expect(executeCommercialPostActivationDueWork(input, inconsistent))
      .resolves.toMatchObject({ ok: false, error: "invalid_follow_up_state" });
    expect(inconsistent.process).not.toHaveBeenCalled();
  });

  it("keeps exact milestone rejections free of settlement instructions", async () => {
    const options = setup();
    options.process.mockResolvedValue({
      ok: false,
      error: "milestone_mismatch",
      message: "mismatch",
    });
    await expect(executeCommercialPostActivationDueWork(input, options)).resolves.toEqual({
      ok: false,
      error: "execution_rejected",
      message: "mismatch",
    });
  });

  it("keeps infrastructure failures observable", async () => {
    const options = setup();
    const failure = new Error("database unavailable");
    options.store.find.mockRejectedValue(failure);
    await expect(executeCommercialPostActivationDueWork(input, options)).rejects.toBe(failure);
  });
});
