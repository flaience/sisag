import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ runtime: vi.fn(), validate: vi.fn() }));
vi.mock("@/modules/commercial/commercial-onboarding-runtime.handler", () => ({
  handleCommercialOnboardingRuntimeEvent: mocks.runtime,
}));
vi.mock("@/platform/core/security", () => ({
  validateInternalRequest: mocks.validate,
}));

import { POST } from "./route";

const outboxId = "aa4c57e3-f801-4fe9-8298-84f3dd2ead05";
const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const event = {
  outboxId,
  eventType: "commercial.onboarding.execution_requested",
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

const request = (body: unknown) =>
  new Request("http://localhost/execute-onboarding-runtime", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST commercial execute-onboarding-runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before executing", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });
    expect(await POST(request(event))).toBe(denied);
    expect(mocks.runtime).not.toHaveBeenCalled();
  });

  it("returns the normalized runtime result", async () => {
    mocks.runtime.mockResolvedValue({
      ok: true,
      outboxId,
      commandKey: `${onboardingId}:configure_scheduling:start`,
      outcome: "completed",
      replayed: false,
      emittedEvents: ["commercial.onboarding.execution_result_received"],
    });

    const response = await POST(request(event));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        outboxId,
        commandKey: `${onboardingId}:configure_scheduling:start`,
        outcome: "completed",
        replayed: false,
      },
      emittedEvents: ["commercial.onboarding.execution_result_received"],
    });
    expect(mocks.runtime).toHaveBeenCalledWith(event);
  });

  it("preserves an idempotent replay", async () => {
    mocks.runtime.mockResolvedValue({
      ok: true,
      outboxId,
      commandKey: `${onboardingId}:configure_scheduling:start`,
      outcome: "completed",
      replayed: true,
      emittedEvents: [],
    });
    const response = await POST(request(event));
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: { replayed: true },
      emittedEvents: [],
    });
  });

  it("maps invalid events to HTTP 400", async () => {
    mocks.runtime.mockResolvedValue({
      ok: false,
      error: "invalid_event",
      retryable: false,
      message: "Evento inválido.",
    });
    const response = await POST(request(event));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_ONBOARDING_INVALID_RUNTIME_EVENT",
        message: "Evento inválido.",
        retryable: false,
      },
    });
  });

  it.each([
    [true, 503],
    [false, 422],
  ])("maps runtime failure with retryable=%s", async (retryable, status) => {
    mocks.runtime.mockResolvedValue({
      ok: false,
      error: "runtime_failed",
      retryable,
      message: "Executor indisponível.",
    });
    const response = await POST(request(event));
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "COMMERCIAL_ONBOARDING_RUNTIME_FAILED", retryable },
    });
  });

  it("rejects malformed JSON before executing", async () => {
    const malformed = new Request("http://localhost", { method: "POST", body: "{" });
    const response = await POST(malformed);
    expect(response.status).toBe(400);
    expect(mocks.runtime).not.toHaveBeenCalled();
  });

  it("does not expose unexpected errors", async () => {
    mocks.runtime.mockRejectedValue(new Error("private runtime credential"));
    const response = await POST(request(event));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível executar o runtime do onboarding comercial.",
        retryable: true,
      },
    });
  });
});
