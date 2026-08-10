import { describe, expect, it, vi } from "vitest";

import { dispatchCommercialOnboarding } from "./commercial-onboarding-dispatch.service";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const commercialClientId = "0d01a808-24fc-480b-9f60-90e2b9f674fc";
const input = {
  onboardingId,
  requestedBy: { type: "system" as const, id: "production-dispatcher" },
  reason: "Despacho controlado da configuração da empresa",
};

function executablePlan() {
  return {
    ok: true as const,
    decision: "execute_agent" as const,
    reason: "A etapa atual está pronta para execução por um agente.",
    command: {
      key: `${onboardingId}:configure_company:start`,
      action: "start" as const,
      onboardingId,
      commercialClientId,
      stepCode: "configure_company",
      stepPosition: 2,
      executorType: "agent" as const,
      input: {},
    },
    snapshot: { onboardingStatus: "in_progress" as const, currentStepCode: "configure_company", progressPercentage: 13 },
  };
}

function setup(options: { planResult?: unknown; transitionResult?: unknown; emitted?: boolean } = {}) {
  const plan = vi.fn().mockResolvedValue(options.planResult ?? executablePlan());
  const transition = vi.fn().mockResolvedValue(options.transitionResult ?? {
    ok: true, replayed: false,
    onboarding: { id: onboardingId, status: "in_progress", currentStepCode: "configure_company" },
    step: { code: "configure_company", status: "in_progress", attempts: 1 },
    emittedEvents: ["commercial.onboarding.step_changed"],
  });
  const store = { emitExecutionRequested: vi.fn().mockResolvedValue(options.emitted ?? true) };
  return { plan, transition, store };
}

describe("commercial onboarding dispatch coordinator", () => {
  it("validates before planning", async () => {
    const dependencies = setup();
    await expect(dispatchCommercialOnboarding({ ...input, reason: "x" }, dependencies)).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(dependencies.plan).not.toHaveBeenCalled();
  });

  it("reserves an executable step and emits one work request", async () => {
    const dependencies = setup();
    await expect(dispatchCommercialOnboarding(input, dependencies)).resolves.toMatchObject({
      ok: true, dispatched: true, replayed: false, decision: "execute_agent",
      transition: { replayed: false, stepStatus: "in_progress" },
      emittedEvents: ["commercial.onboarding.execution_requested"],
    });
    expect(dependencies.transition).toHaveBeenCalledWith(expect.objectContaining({
      stepCode: "configure_company", action: "start",
      actor: { type: "agent", id: "onboarding-dispatch:production-dispatcher" },
    }));
    expect(dependencies.store.emitExecutionRequested).toHaveBeenCalledWith(expect.objectContaining({ plan: expect.objectContaining({ command: expect.objectContaining({ key: `${onboardingId}:configure_company:start` }) }) }));
  });

  it.each(["request_human", "wait", "blocked", "finished"] as const)("does not dispatch a %s decision", async (decision) => {
    const dependencies = setup({ planResult: { ok: true, decision, reason: "Sem execução automática.", command: null, snapshot: { onboardingStatus: "in_progress", currentStepCode: null, progressPercentage: 13 } } });
    await expect(dispatchCommercialOnboarding(input, dependencies)).resolves.toMatchObject({ ok: true, dispatched: false, decision, transition: null, emittedEvents: [] });
    expect(dependencies.transition).not.toHaveBeenCalled();
    expect(dependencies.store.emitExecutionRequested).not.toHaveBeenCalled();
  });

  it("maps a missing onboarding without reserving work", async () => {
    const dependencies = setup({ planResult: { ok: false, error: "onboarding_not_found", message: "Não encontrado." } });
    await expect(dispatchCommercialOnboarding(input, dependencies)).resolves.toMatchObject({ ok: false, error: "onboarding_not_found" });
    expect(dependencies.transition).not.toHaveBeenCalled();
  });

  it("contains a controlled transition failure", async () => {
    const dependencies = setup({ transitionResult: { ok: false, error: "step_out_of_order", message: "Fora de ordem." } });
    await expect(dispatchCommercialOnboarding(input, dependencies)).resolves.toMatchObject({ ok: false, error: "transition_failed" });
    expect(dependencies.store.emitExecutionRequested).not.toHaveBeenCalled();
  });

  it("replays safely when the outbox request already exists", async () => {
    const dependencies = setup({ emitted: false });
    await expect(dispatchCommercialOnboarding(input, dependencies)).resolves.toMatchObject({ ok: true, dispatched: false, replayed: true, emittedEvents: [] });
  });

  it("reports a partial failure without exposing its cause", async () => {
    const dependencies = setup();
    dependencies.store.emitExecutionRequested.mockRejectedValue(new Error("database secret"));
    await expect(dispatchCommercialOnboarding(input, dependencies)).resolves.toEqual({
      ok: false,
      error: "dispatch_failed",
      message: "A etapa foi reservada, mas a solicitação de execução não pôde ser registrada.",
    });
  });
});
