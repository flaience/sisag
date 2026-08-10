import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ dispatch: vi.fn(), validate: vi.fn() }));
vi.mock("@/modules/commercial/commercial-onboarding-dispatch.service", () => ({
  dispatchCommercialOnboarding: mocks.dispatch,
}));
vi.mock("@/platform/core/security", () => ({ validateInternalRequest: mocks.validate }));

import { POST } from "./route";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const input = {
  onboardingId,
  requestedBy: { type: "system", id: "production-dispatcher" },
  reason: "Despacho controlado da configuração da empresa",
};
const request = (body: unknown) => new Request("http://localhost/dispatch-onboarding-execution", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

function success(dispatched: boolean) {
  return {
    ok: true,
    dispatched,
    replayed: !dispatched,
    decision: dispatched ? "execute_agent" : "wait",
    reason: dispatched ? "Pronto para agente." : "Aguardar.",
    command: dispatched ? { key: `${onboardingId}:configure_company:start`, action: "start", stepCode: "configure_company" } : null,
    transition: dispatched ? { replayed: false, onboardingStatus: "in_progress", stepStatus: "in_progress" } : null,
    emittedEvents: dispatched ? ["commercial.onboarding.execution_requested"] : [],
  };
}

describe("POST commercial dispatch-onboarding-execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before dispatching", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });
    expect(await POST(request(input))).toBe(denied);
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it("returns HTTP 202 when new work is dispatched", async () => {
    mocks.dispatch.mockResolvedValue(success(true));
    const response = await POST(request(input));
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: { dispatched: true, decision: "execute_agent", transition: { stepStatus: "in_progress" } },
      emittedEvents: ["commercial.onboarding.execution_requested"],
    });
    expect(mocks.dispatch).toHaveBeenCalledWith(input);
  });

  it("returns HTTP 200 when no new work is dispatched", async () => {
    mocks.dispatch.mockResolvedValue(success(false));
    const response = await POST(request(input));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, data: { dispatched: false, replayed: true }, emittedEvents: [] });
  });

  it.each([
    ["invalid_input", 400, "COMMERCIAL_INVALID_INPUT"],
    ["onboarding_not_found", 404, "COMMERCIAL_ONBOARDING_NOT_FOUND"],
    ["planning_failed", 409, "COMMERCIAL_ONBOARDING_PLANNING_FAILED"],
    ["transition_failed", 409, "COMMERCIAL_ONBOARDING_TRANSITION_FAILED"],
    ["dispatch_failed", 500, "COMMERCIAL_ONBOARDING_DISPATCH_FAILED"],
  ] as const)("maps %s", async (error, status, code) => {
    mocks.dispatch.mockResolvedValue({ ok: false, error, message: "Falha controlada." });
    const response = await POST(request(input));
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ ok: false, error: { code, message: "Falha controlada." } });
  });

  it("rejects malformed JSON before dispatching", async () => {
    const malformed = new Request("http://localhost", { method: "POST", body: "{" });
    const response = await POST(malformed);
    expect(response.status).toBe(400);
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it("does not expose unexpected errors", async () => {
    mocks.dispatch.mockRejectedValue(new Error("private dispatcher detail"));
    const response = await POST(request(input));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível despachar a execução do onboarding comercial.",
      },
    });
  });
});
