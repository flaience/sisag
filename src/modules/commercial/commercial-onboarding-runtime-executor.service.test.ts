import { describe, expect, it, vi } from "vitest";

import { executeCommercialOnboardingRuntime } from "./commercial-onboarding-runtime-executor.service";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const clientId = "0d01a808-24fc-480b-9f60-90e2b9f674fc";
const event = (executorType: "agent" | "system" | "n8n" | "human" = "agent") => ({
  command: {
    key: `${onboardingId}:configure_scheduling:start`,
    action: "start" as const,
    onboardingId,
    commercialClientId: clientId,
    stepCode: "configure_scheduling",
    stepPosition: 3,
    executorType,
    input: {},
  },
  decision: ({ agent: "execute_agent", system: "execute_system", n8n: "dispatch_n8n", human: "execute_agent" } as const)[executorType],
  requestedBy: { type: "system" as const, id: "production-dispatcher" },
  reason: "Execução automatizada da configuração da agenda",
  requestedAt: "2026-08-10T18:00:00.000Z",
});

function setup(result: unknown = { outcome: "completed", reason: "Agenda configurada", result: { configured: true } }) {
  const adapter = { id: "scheduling-agent", execute: vi.fn().mockResolvedValue(result) };
  const submit = vi.fn().mockResolvedValue({
    ok: true, replayed: false, outcome: "completed",
    onboarding: { id: onboardingId, status: "in_progress", currentStepCode: "configure_team" },
    step: { code: "configure_scheduling", status: "completed", attempts: 1 },
    emittedEvents: ["commercial.onboarding.execution_result_received"],
  });
  return { adapter, submit };
}

describe("commercial onboarding runtime executor", () => {
  it("rejects an invalid execution event", async () => {
    await expect(executeCommercialOnboardingRuntime({})).resolves.toMatchObject({ ok: false, error: "invalid_event" });
  });

  it("rejects a decision that does not match the executor", async () => {
    await expect(executeCommercialOnboardingRuntime({ ...event("agent"), decision: "dispatch_n8n" })).resolves.toMatchObject({ ok: false, error: "decision_mismatch" });
  });

  it("keeps human work outside automatic execution", async () => {
    await expect(executeCommercialOnboardingRuntime(event("human"))).resolves.toMatchObject({ ok: false, error: "decision_mismatch" });
  });

  it("reports an unavailable adapter without submitting a result", async () => {
    const submit = vi.fn();
    await expect(executeCommercialOnboardingRuntime(event(), { submit })).resolves.toMatchObject({ ok: false, error: "executor_unavailable" });
    expect(submit).not.toHaveBeenCalled();
  });

  it.each([
    ["agent", "execute_agent"],
    ["system", "execute_system"],
    ["n8n", "dispatch_n8n"],
  ] as const)("executes and submits a %s result for %s", async (executorType) => {
    const dependencies = setup();
    const response = await executeCommercialOnboardingRuntime(event(executorType), {
      adapters: { [executorType]: dependencies.adapter },
      submit: dependencies.submit,
    });
    expect(response).toMatchObject({ ok: true, executor: { type: executorType, id: "scheduling-agent" }, outcome: "completed", replayed: false });
    expect(dependencies.adapter.execute).toHaveBeenCalledWith(expect.objectContaining({ stepCode: "configure_scheduling" }));
    expect(dependencies.submit).toHaveBeenCalledWith(expect.objectContaining({ executor: { type: executorType, id: "scheduling-agent" }, outcome: "completed" }));
  });

  it.each(["blocked", "failed", "human_required"] as const)("submits a %s outcome", async (outcome) => {
    const dependencies = setup({ outcome, reason: "Execução requer atenção", error: "Dependência indisponível" });
    await executeCommercialOnboardingRuntime(event(), { adapters: { agent: dependencies.adapter }, submit: dependencies.submit });
    expect(dependencies.submit).toHaveBeenCalledWith(expect.objectContaining({ outcome, error: "Dependência indisponível" }));
  });

  it("contains adapter exceptions", async () => {
    const dependencies = setup();
    dependencies.adapter.execute.mockRejectedValue(new Error("private adapter credential"));
    await expect(executeCommercialOnboardingRuntime(event(), { adapters: { agent: dependencies.adapter }, submit: dependencies.submit })).resolves.toEqual({ ok: false, error: "execution_failed", message: "O executor não conseguiu processar a etapa do onboarding." });
    expect(dependencies.submit).not.toHaveBeenCalled();
  });

  it("rejects malformed adapter output", async () => {
    const dependencies = setup({ outcome: "unknown", reason: "Invalid output" });
    await expect(executeCommercialOnboardingRuntime(event(), { adapters: { agent: dependencies.adapter }, submit: dependencies.submit })).resolves.toMatchObject({ ok: false, error: "execution_failed" });
  });

  it("contains callback failures", async () => {
    const dependencies = setup();
    dependencies.submit.mockRejectedValue(new Error("private callback detail"));
    await expect(executeCommercialOnboardingRuntime(event(), { adapters: { agent: dependencies.adapter }, submit: dependencies.submit })).resolves.toEqual({ ok: false, error: "result_rejected", message: "O resultado foi produzido, mas não pôde ser entregue ao onboarding." });
  });

  it("preserves callback replay information", async () => {
    const dependencies = setup();
    dependencies.submit.mockResolvedValue({ ok: true, replayed: true, outcome: "completed", onboarding: null, step: null, emittedEvents: [] });
    await expect(executeCommercialOnboardingRuntime(event(), { adapters: { agent: dependencies.adapter }, submit: dependencies.submit })).resolves.toMatchObject({ ok: true, replayed: true, onboarding: null, emittedEvents: [] });
  });
});
