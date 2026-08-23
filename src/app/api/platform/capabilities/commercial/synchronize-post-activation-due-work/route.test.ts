import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ synchronize: vi.fn(), validate: vi.fn() }));
vi.mock("@/modules/commercial/commercial-post-activation-due-work-persistence.service", () => ({
  synchronizeCommercialPostActivationDueWork: mocks.synchronize,
}));
vi.mock("@/platform/core/security", () => ({ validateInternalRequest: mocks.validate }));

import { POST } from "./route";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const payload = {
  onboardingId,
  plan: {
    onboardingId,
    milestones: [{ code: "welcome", dueAt: "2026-08-24T12:00:00.000Z" }],
  },
  executions: [],
};
const request = (body = JSON.stringify(payload)) => new Request(
  "http://localhost/synchronize-post-activation-due-work",
  { method: "POST", headers: { "content-type": "application/json" }, body },
);

describe("POST synchronize post-activation due work", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before reading the body", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });

    expect(await POST(request())).toBe(denied);
    expect(mocks.synchronize).not.toHaveBeenCalled();
  });

  it("returns the durable synchronization summary", async () => {
    mocks.synchronize.mockResolvedValue({
      ok: true,
      onboardingId,
      total: 3,
      created: 1,
      updated: 1,
      preserved: 1,
      completed: 1,
    });

    const response = await POST(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        onboardingId,
        total: 3,
        created: 1,
        updated: 1,
        preserved: 1,
        completed: 1,
      },
    });
    expect(mocks.synchronize).toHaveBeenCalledWith(payload);
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await POST(request("{"));
    expect(response.status).toBe(400);
    expect(mocks.synchronize).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid synchronization data", async () => {
    mocks.synchronize.mockResolvedValue({
      ok: false,
      error: "invalid_input",
      message: "private validation detail",
    });

    const response = await POST(request());
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_INVALID_INPUT",
        message: "Dados para sincronização dos trabalhos pós-ativação inválidos.",
      },
    });
  });

  it("returns 409 for an inconsistent plan and execution history", async () => {
    mocks.synchronize.mockResolvedValue({
      ok: false,
      error: "invalid_plan_state",
      message: "private plan detail",
    });

    const response = await POST(request());
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_INVALID_PLAN_STATE",
        message: "O plano e o histórico pós-ativação são inconsistentes.",
      },
    });
  });

  it("does not expose unexpected storage errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.synchronize.mockRejectedValue(new Error("private database detail"));

    const response = await POST(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível sincronizar os trabalhos pós-ativação.",
      },
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("validates the internal request exactly once", async () => {
    mocks.synchronize.mockResolvedValue({
      ok: true, onboardingId, total: 0, created: 0, updated: 0, preserved: 0, completed: 0,
    });
    await POST(request());
    expect(mocks.validate).toHaveBeenCalledTimes(1);
    expect(mocks.validate).toHaveBeenCalledWith(expect.any(Request));
  });
});
