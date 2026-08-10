import { describe, expect, it, vi } from "vitest";

import {
  createCommercialOnboardingRuntimeHandler,
  handleCommercialOnboardingRuntimeEvent,
} from "./commercial-onboarding-runtime.handler";

const outboxId = "aa4c57e3-f801-4fe9-8298-84f3dd2ead05";
const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const event = {
  outboxId,
  eventType: "commercial.onboarding.execution_requested" as const,
  payload: {
    command: {
      key: `${onboardingId}:configure_scheduling:start`,
      action: "start",
      onboardingId,
      commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
      stepCode: "configure_scheduling",
      stepPosition: 3,
      executorType: "agent",
      input: {},
    },
    decision: "execute_agent",
    requestedBy: { type: "system", id: "production-dispatcher" },
    reason: "Execução automatizada da configuração da agenda",
    requestedAt: "2026-08-10T18:00:00.000Z",
  },
};

function successfulRuntime(replayed = false) {
  return vi.fn().mockResolvedValue({
    ok: true,
    commandKey: `${onboardingId}:configure_scheduling:start`,
    executor: { type: "agent", id: "scheduling-agent" },
    outcome: "completed",
    replayed,
    onboarding: { id: onboardingId, status: "in_progress", currentStepCode: "configure_team" },
    step: { code: "configure_scheduling", status: "completed", attempts: 1 },
    emittedEvents: replayed ? [] : ["commercial.onboarding.execution_result_received"],
  });
}

describe("commercial onboarding runtime handler", () => {
  it("rejects an invalid outbox envelope before invoking the runtime", async () => {
    const runtime = successfulRuntime();
    await expect(handleCommercialOnboardingRuntimeEvent(
      { ...event, outboxId: "invalid" },
      { runtime },
    )).resolves.toMatchObject({ ok: false, error: "invalid_event", retryable: false });
    expect(runtime).not.toHaveBeenCalled();
  });

  it("rejects a different event type", async () => {
    const runtime = successfulRuntime();
    await expect(handleCommercialOnboardingRuntimeEvent(
      { ...event, eventType: "commercial.onboarding.created" as never },
      { runtime },
    )).resolves.toMatchObject({ ok: false, error: "invalid_event", retryable: false });
    expect(runtime).not.toHaveBeenCalled();
  });

  it("passes only the payload and adapters to the runtime", async () => {
    const runtime = successfulRuntime();
    const agent = { id: "scheduling-agent", execute: vi.fn() };
    const result = await handleCommercialOnboardingRuntimeEvent(event, {
      adapters: { agent },
      runtime,
    });
    expect(result).toMatchObject({
      ok: true,
      outboxId,
      commandKey: `${onboardingId}:configure_scheduling:start`,
      outcome: "completed",
      replayed: false,
    });
    expect(runtime).toHaveBeenCalledWith(event.payload, {
      adapters: { agent },
    });
  });

  it("preserves an idempotent runtime replay", async () => {
    const runtime = successfulRuntime(true);
    await expect(handleCommercialOnboardingRuntimeEvent(event, { runtime })).resolves.toMatchObject({
      ok: true,
      replayed: true,
      emittedEvents: [],
    });
  });

  it.each(["invalid_event", "decision_mismatch"])("marks %s as non-retryable", async (error) => {
    const runtime = vi.fn().mockResolvedValue({ ok: false, error, message: "Evento incompatível." });
    await expect(handleCommercialOnboardingRuntimeEvent(event, { runtime })).resolves.toEqual({
      ok: false,
      error: "runtime_failed",
      retryable: false,
      message: "Evento incompatível.",
    });
  });

  it.each(["executor_unavailable", "execution_failed", "result_rejected"])("marks %s as retryable", async (error) => {
    const runtime = vi.fn().mockResolvedValue({ ok: false, error, message: "Falha temporária." });
    await expect(handleCommercialOnboardingRuntimeEvent(event, { runtime })).resolves.toEqual({
      ok: false,
      error: "runtime_failed",
      retryable: true,
      message: "Falha temporária.",
    });
  });

  it("contains unexpected runtime exceptions", async () => {
    const runtime = vi.fn().mockRejectedValue(new Error("private runtime credential"));
    await expect(handleCommercialOnboardingRuntimeEvent(event, { runtime })).resolves.toEqual({
      ok: false,
      error: "runtime_failed",
      retryable: true,
      message: "O runtime comercial não conseguiu processar o evento.",
    });
  });

  it("creates a preconfigured handler", async () => {
    const runtime = successfulRuntime();
    const agent = { id: "scheduling-agent", execute: vi.fn() };
    const handler = createCommercialOnboardingRuntimeHandler({ adapters: { agent }, runtime });
    await handler(event);
    expect(runtime).toHaveBeenCalledWith(event.payload, { adapters: { agent } });
  });
});
