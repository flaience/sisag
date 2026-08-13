import { describe, expect, it, vi } from "vitest";

import { transitionCommercialOnboardingStep, type TransitionCommercialOnboardingStepInput } from "./commercial-onboarding-workflow.service";

const input: TransitionCommercialOnboardingStepInput = {
  onboardingId: "11111111-1111-4111-8111-111111111111",
  stepCode: "validate_registration",
  action: "start",
  actor: { type: "system", id: "onboarding-agent" },
  reason: "Início da validação cadastral",
};

function createStore(options: { onboardingStatus?: "pending" | "in_progress" | "blocked" | "completed" | "cancelled"; firstStatus?: "pending" | "in_progress" | "blocked" | "completed"; secondStatus?: "pending" | "in_progress" | "completed"; missing?: boolean } = {}) {
  const onboarding = { id: input.onboardingId, commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc", status: options.onboardingStatus ?? "pending", currentStepCode: "validate_registration" } as const;
  const steps = [
    { id: "step-1", code: "validate_registration", position: 1, status: options.firstStatus ?? "pending", attempts: 0, input: {} },
    { id: "step-2", code: "configure_company", position: 2, status: options.secondStatus ?? "pending", attempts: 0, input: {} },
  ];
  const tx = {
    findOnboardingForUpdate: vi.fn().mockResolvedValue(options.missing ? null : onboarding),
    listStepsForUpdate: vi.fn().mockResolvedValue(steps),
    updateStep: vi.fn().mockResolvedValue(undefined), updateOnboarding: vi.fn().mockResolvedValue(undefined),
    activateClient: vi.fn().mockResolvedValue(undefined), emit: vi.fn().mockResolvedValue(true),
  };
  return { store: { transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)) }, tx };
}

describe("commercial onboarding workflow", () => {
  it("validates before opening a transaction", async () => {
    const { store } = createStore();
    await expect(transitionCommercialOnboardingStep({ ...input, reason: "x" }, { store })).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(store.transaction).not.toHaveBeenCalled();
  });

  it("starts the current step and onboarding atomically", async () => {
    const { store, tx } = createStore();
    await expect(transitionCommercialOnboardingStep(input, { store, now: () => new Date("2026-08-09T20:00:00Z") })).resolves.toMatchObject({ ok: true, replayed: false, onboarding: { status: "in_progress" }, step: { status: "in_progress", attempts: 1 }, emittedEvents: ["commercial.onboarding.step_changed"] });
    expect(tx.updateStep).toHaveBeenCalledWith(expect.objectContaining({ status: "in_progress", attempts: 1 }));
    expect(tx.updateOnboarding).toHaveBeenCalledWith(expect.objectContaining({ status: "in_progress" }));
  });

  it("rejects a future step", async () => {
    const { store, tx } = createStore();
    await expect(transitionCommercialOnboardingStep({ ...input, stepCode: "configure_company" }, { store })).resolves.toMatchObject({ ok: false, error: "step_out_of_order" });
    expect(tx.updateStep).not.toHaveBeenCalled();
  });

  it("blocks and resumes the current step while preserving attempts", async () => {
    const blocked = createStore({ onboardingStatus: "in_progress", firstStatus: "in_progress" });
    await expect(transitionCommercialOnboardingStep({ ...input, action: "block", error: "Documento ilegível" }, { store: blocked.store })).resolves.toMatchObject({ ok: true, step: { status: "blocked", attempts: 0 }, onboarding: { status: "blocked" } });
    const resumed = createStore({ onboardingStatus: "blocked", firstStatus: "blocked" });
    await expect(transitionCommercialOnboardingStep({ ...input, action: "resume" }, { store: resumed.store })).resolves.toMatchObject({ ok: true, step: { status: "in_progress", attempts: 1 } });
  });

  it("advances after completing the current step", async () => {
    const { store } = createStore({ onboardingStatus: "in_progress", firstStatus: "in_progress" });
    await expect(transitionCommercialOnboardingStep({ ...input, action: "complete", result: { valid: true } }, { store })).resolves.toMatchObject({ ok: true, onboarding: { status: "in_progress", currentStepCode: "configure_company" }, step: { status: "completed" } });
  });

  it("completes onboarding and activates the client after the final step", async () => {
    const { store, tx } = createStore({ onboardingStatus: "in_progress", firstStatus: "completed", secondStatus: "in_progress" });
    await expect(transitionCommercialOnboardingStep({ ...input, stepCode: "configure_company", action: "complete" }, { store })).resolves.toMatchObject({ ok: true, onboarding: { status: "completed", currentStepCode: null }, emittedEvents: ["commercial.onboarding.completed"] });
    expect(tx.activateClient).toHaveBeenCalled();
  });

  it("replays an already-applied transition without writes or events", async () => {
    const { store, tx } = createStore({ onboardingStatus: "in_progress", firstStatus: "in_progress" });
    await expect(transitionCommercialOnboardingStep(input, { store })).resolves.toMatchObject({ ok: true, replayed: true, emittedEvents: [] });
    expect(tx.updateStep).not.toHaveBeenCalled();
  });

  it.each(["completed", "cancelled"] as const)("rejects a terminal %s onboarding", async (onboardingStatus) => {
    const { store } = createStore({ onboardingStatus });
    await expect(transitionCommercialOnboardingStep(input, { store })).resolves.toMatchObject({ ok: false, error: "onboarding_terminal" });
  });
});
