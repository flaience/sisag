import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ submit: vi.fn(), validate: vi.fn() }));
vi.mock("@/modules/commercial/commercial-onboarding-execution-result.service", () => ({
  submitCommercialOnboardingExecutionResult: mocks.submit,
}));
vi.mock("@/platform/core/security", () => ({ validateInternalRequest: mocks.validate }));

import { POST } from "./route";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const input = {
  commandKey: `${onboardingId}:configure_company:start`,
  outcome: "completed",
  executor: { type: "agent", id: "company-configuration-agent" },
  reason: "Configuração da empresa concluída",
  result: { configured: true },
};
const request = (body: unknown) => new Request("http://localhost/submit-onboarding-execution-result", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

describe("POST commercial submit-onboarding-execution-result", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before submitting", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });
    expect(await POST(request(input))).toBe(denied);
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("returns the accepted execution result", async () => {
    mocks.submit.mockResolvedValue({
      ok: true,
      replayed: false,
      outcome: "completed",
      onboarding: { id: onboardingId, status: "in_progress", currentStepCode: "configure_scheduling" },
      step: { code: "configure_company", status: "completed", attempts: 1 },
      emittedEvents: ["commercial.onboarding.execution_result_received"],
    });
    const response = await POST(request(input));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: { replayed: false, outcome: "completed", step: { status: "completed" } },
      emittedEvents: ["commercial.onboarding.execution_result_received"],
    });
    expect(mocks.submit).toHaveBeenCalledWith(input);
  });

  it("returns an idempotent replay", async () => {
    mocks.submit.mockResolvedValue({
      ok: true, replayed: true, outcome: "completed", onboarding: null, step: null, emittedEvents: [],
    });
    const response = await POST(request(input));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true, data: { replayed: true, outcome: "completed", onboarding: null, step: null }, emittedEvents: [],
    });
  });

  it.each([
    ["invalid_input", 400, "COMMERCIAL_INVALID_INPUT"],
    ["onboarding_not_found", 404, "COMMERCIAL_ONBOARDING_NOT_FOUND"],
    ["command_mismatch", 409, "COMMERCIAL_ONBOARDING_COMMAND_MISMATCH"],
    ["executor_mismatch", 409, "COMMERCIAL_ONBOARDING_EXECUTOR_MISMATCH"],
    ["step_not_in_progress", 409, "COMMERCIAL_ONBOARDING_STEP_NOT_IN_PROGRESS"],
    ["transition_failed", 409, "COMMERCIAL_ONBOARDING_TRANSITION_FAILED"],
    ["result_record_failed", 500, "COMMERCIAL_ONBOARDING_RESULT_RECORD_FAILED"],
  ] as const)("maps %s", async (error, status, code) => {
    mocks.submit.mockResolvedValue({ ok: false, error, message: "Falha controlada." });
    const response = await POST(request(input));
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ ok: false, error: { code, message: "Falha controlada." } });
  });

  it("rejects malformed JSON before submitting", async () => {
    const malformed = new Request("http://localhost", { method: "POST", body: "{" });
    const response = await POST(malformed);
    expect(response.status).toBe(400);
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("does not expose unexpected errors", async () => {
    mocks.submit.mockRejectedValue(new Error("private execution detail"));
    const response = await POST(request(input));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível registrar o resultado da execução do onboarding comercial.",
      },
    });
  });
});
