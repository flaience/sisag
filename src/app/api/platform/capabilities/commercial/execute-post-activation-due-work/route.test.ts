import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ execute: vi.fn(), validate: vi.fn() }));
vi.mock("@/modules/commercial/commercial-post-activation-due-work-unit-executor.service", () => ({
  executeCommercialPostActivationDueWork: mocks.execute,
}));
vi.mock("@/platform/core/security", () => ({ validateInternalRequest: mocks.validate }));

import { POST } from "./route";

const payload = {
  workId: "53164020-8778-4226-afed-189e8d2333cc",
  workerKey: "worker:saopaulo-1",
  onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
  milestoneCode: "welcome",
};
const request = (body = JSON.stringify(payload)) => new Request(
  "http://localhost/execute-post-activation-due-work",
  { method: "POST", headers: { "content-type": "application/json" }, body },
);

function success(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    ...payload,
    decision: "completed",
    settlementOutcome: "completed",
    deferSeconds: null,
    replayed: false,
    missingIndicators: [],
    activeEscalations: [],
    emittedEvents: ["commercial.post_activation.milestone_completed"],
    ...overrides,
  };
}

describe("POST commercial execute-post-activation-due-work", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before reading the body", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });
    expect(await POST(request())).toBe(denied);
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("returns a completed unit execution", async () => {
    mocks.execute.mockResolvedValue(success());
    const response = await POST(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        ...payload,
        decision: "completed",
        settlementOutcome: "completed",
        deferSeconds: null,
        replayed: false,
        missingIndicators: [],
        activeEscalations: [],
        emittedEvents: ["commercial.post_activation.milestone_completed"],
      },
    });
    expect(mocks.execute).toHaveBeenCalledWith(payload);
  });

  it("returns a deferred execution without treating it as failure", async () => {
    mocks.execute.mockResolvedValue(success({
      decision: "wait",
      settlementOutcome: "deferred",
      deferSeconds: 900,
      missingIndicators: ["support_channel_confirmed"],
      emittedEvents: [],
    }));
    const response = await POST(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: {
        decision: "wait",
        settlementOutcome: "deferred",
        deferSeconds: 900,
      },
    });
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await POST(request("{"));
    expect(response.status).toBe(400);
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid execution input", async () => {
    mocks.execute.mockResolvedValue({
      ok: false, error: "invalid_input", message: "Dados inválidos.",
    });
    const response = await POST(request());
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "COMMERCIAL_INVALID_INPUT" },
    });
  });

  it("returns 404 without exposing onboarding lookup details", async () => {
    mocks.execute.mockResolvedValue({
      ok: false, error: "onboarding_not_found", message: "private lookup detail",
    });
    const response = await POST(request());
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_DUE_WORK_ONBOARDING_NOT_FOUND",
        message: "O onboarding do trabalho pós-ativação não foi encontrado.",
      },
    });
  });

  it.each([
    ["invalid_follow_up_state", "COMMERCIAL_DUE_WORK_INVALID_FOLLOW_UP_STATE"],
    ["execution_rejected", "COMMERCIAL_DUE_WORK_EXECUTION_REJECTED"],
  ])("returns 409 for %s", async (error, code) => {
    mocks.execute.mockResolvedValue({ ok: false, error, message: "private state detail" });
    const response = await POST(request());
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code,
        message: "O trabalho pós-ativação não pode ser executado no estado atual.",
      },
    });
  });

  it("does not expose unexpected infrastructure errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.execute.mockRejectedValue(new Error("private database detail"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível executar o trabalho pós-ativação.",
      },
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("validates the internal request exactly once", async () => {
    mocks.execute.mockResolvedValue(success());
    await POST(request());
    expect(mocks.validate).toHaveBeenCalledTimes(1);
    expect(mocks.validate).toHaveBeenCalledWith(expect.any(Request));
  });
});
