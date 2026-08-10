import { describe, expect, it, vi } from "vitest";

import { submitCommercialOnboardingExecutionResult } from "./commercial-onboarding-execution-result.service";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const commandKey = `${onboardingId}:configure_company:start`;
const input = {
  commandKey,
  outcome: "completed" as const,
  executor: { type: "agent" as const, id: "company-configuration-agent" },
  reason: "Configuração da empresa concluída",
  result: { configured: true },
};

function state(options: { stepCode?: string; status?: "pending" | "in_progress" | "blocked"; dispatchKey?: string; executorType?: "agent" | "system" } = {}) {
  const step = {
    id: "step-2", code: options.stepCode ?? "configure_company", position: 2, title: "Configuração da empresa",
    status: options.status ?? "in_progress", executorType: options.executorType ?? "agent", executorId: "dispatcher",
    attempts: 1, lastError: null, input: { dispatchKey: options.dispatchKey ?? commandKey }, result: null,
    startedAt: new Date(), completedAt: null, updatedAt: new Date(), isCurrent: true,
    availableActions: ["complete", "block", "cancel"],
  };
  return {
    ok: true as const,
    data: {
      onboarding: { id: onboardingId, commercialClientId: "client-1", status: "in_progress" as const, currentStepCode: step.code, blockedReason: null, input: {}, result: null, startedAt: new Date(), completedAt: null, cancelledAt: null, createdAt: new Date(), updatedAt: new Date() },
      client: null, progress: { total: 8, completed: 1, pending: 7, percentage: 13 }, currentStep: step, steps: [step],
    },
  };
}

function setup(options: { received?: boolean; queryResult?: unknown; transitionResult?: unknown; emitted?: boolean } = {}) {
  const store = {
    wasReceived: vi.fn().mockResolvedValue(options.received ?? false),
    emitReceived: vi.fn().mockResolvedValue(options.emitted ?? true),
  };
  const query = vi.fn().mockResolvedValue(options.queryResult ?? state());
  const transition = vi.fn().mockResolvedValue(options.transitionResult ?? {
    ok: true, replayed: false,
    onboarding: { id: onboardingId, status: "in_progress", currentStepCode: "configure_scheduling" },
    step: { code: "configure_company", status: "completed", attempts: 1 },
    emittedEvents: ["commercial.onboarding.step_changed"],
  });
  return { store, query, transition };
}

describe("commercial onboarding execution result", () => {
  it("validates the command key before querying", async () => {
    const dependencies = setup();
    await expect(submitCommercialOnboardingExecutionResult({ ...input, commandKey: "invalid" }, dependencies)).resolves.toMatchObject({ ok: false, error: "invalid_input" });
    expect(dependencies.query).not.toHaveBeenCalled();
  });

  it("replays a previously recorded result without querying or transitioning", async () => {
    const dependencies = setup({ received: true });
    await expect(submitCommercialOnboardingExecutionResult(input, dependencies)).resolves.toMatchObject({ ok: true, replayed: true, outcome: "completed", emittedEvents: [] });
    expect(dependencies.query).not.toHaveBeenCalled();
    expect(dependencies.transition).not.toHaveBeenCalled();
  });

  it("completes the reserved step and records the outcome", async () => {
    const dependencies = setup();
    await expect(submitCommercialOnboardingExecutionResult(input, dependencies)).resolves.toMatchObject({ ok: true, replayed: false, step: { status: "completed" }, emittedEvents: ["commercial.onboarding.execution_result_received"] });
    expect(dependencies.transition).toHaveBeenCalledWith(expect.objectContaining({ action: "complete", stepCode: "configure_company", result: { configured: true } }));
    expect(dependencies.store.emitReceived).toHaveBeenCalledWith(expect.objectContaining({ dedupeKey: `commercial.onboarding.execution_result_received:${commandKey}:completed` }));
  });

  it.each(["blocked", "failed", "human_required"] as const)("blocks the step for a %s outcome", async (outcome) => {
    const dependencies = setup({ transitionResult: { ok: true, replayed: false, onboarding: { id: onboardingId, status: "blocked", currentStepCode: "configure_company" }, step: { code: "configure_company", status: "blocked", attempts: 1 }, emittedEvents: ["commercial.onboarding.step_changed"] } });
    await expect(submitCommercialOnboardingExecutionResult({ ...input, outcome, error: "Dependência indisponível" }, dependencies)).resolves.toMatchObject({ ok: true, outcome, step: { status: "blocked" } });
    expect(dependencies.transition).toHaveBeenCalledWith(expect.objectContaining({ action: "block" }));
  });

  it("rejects a command for another current step", async () => {
    const dependencies = setup({ queryResult: state({ stepCode: "configure_scheduling" }) });
    await expect(submitCommercialOnboardingExecutionResult(input, dependencies)).resolves.toMatchObject({ ok: false, error: "command_mismatch" });
  });

  it("rejects a command that did not reserve the current step", async () => {
    const dependencies = setup({ queryResult: state({ dispatchKey: "another-command" }) });
    await expect(submitCommercialOnboardingExecutionResult(input, dependencies)).resolves.toMatchObject({ ok: false, error: "command_mismatch" });
  });

  it("rejects an executor of a different type", async () => {
    const dependencies = setup();
    await expect(submitCommercialOnboardingExecutionResult({ ...input, executor: { type: "system", id: "wrong" } }, dependencies)).resolves.toMatchObject({ ok: false, error: "executor_mismatch" });
  });

  it("rejects a step that is not in progress", async () => {
    const dependencies = setup({ queryResult: state({ status: "pending" }) });
    await expect(submitCommercialOnboardingExecutionResult(input, dependencies)).resolves.toMatchObject({ ok: false, error: "step_not_in_progress" });
  });

  it("reports a partial result-recording failure without exposing its cause", async () => {
    const dependencies = setup();
    dependencies.store.emitReceived.mockRejectedValue(new Error("database secret"));
    await expect(submitCommercialOnboardingExecutionResult(input, dependencies)).resolves.toEqual({ ok: false, error: "result_record_failed", message: "A transição foi aplicada, mas o resultado da execução não pôde ser registrado." });
  });
});
