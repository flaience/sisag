import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ run: vi.fn(), validate: vi.fn() }));

vi.mock("@/modules/commercial/commercial-post-activation-due-runner.service", () => ({
  runCommercialPostActivationDueMilestones: mocks.run,
}));
vi.mock("@/platform/core/security", () => ({
  validateInternalRequest: mocks.validate,
}));

import { POST } from "./route";

const request = (body?: unknown) => new Request("http://localhost/run-due-milestones", {
  method: "POST",
  headers: { "content-type": "application/json" },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

const summary = (overrides: Record<string, unknown> = {}) => ({
  ok: true,
  scanned: 4,
  due: 3,
  processed: 2,
  waiting: 1,
  completed: 1,
  escalated: 0,
  plansCompleted: 0,
  failed: 1,
  failures: [{
    onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
    error: "collector_unavailable",
  }],
  ...overrides,
});

describe("POST commercial run-post-activation-due-milestones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before running", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });

    expect(await POST(request({ limit: 10 }))).toBe(denied);
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it("runs a limited batch and returns its operational summary", async () => {
    mocks.run.mockResolvedValue(summary());

    const response = await POST(request({ limit: 10 }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        scanned: 4,
        due: 3,
        processed: 2,
        waiting: 1,
        completed: 1,
        escalated: 0,
        plansCompleted: 0,
        failed: 1,
        failures: [{
          onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
          error: "collector_unavailable",
        }],
      },
    });
    expect(mocks.run).toHaveBeenCalledWith({ limit: 10 });
  });

  it("accepts an empty body and uses runner defaults", async () => {
    mocks.run.mockResolvedValue(summary({
      scanned: 0,
      due: 0,
      processed: 0,
      waiting: 0,
      completed: 0,
      failed: 0,
      failures: [],
    }));

    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.run).toHaveBeenCalledWith({});
  });

  it("maps invalid input to HTTP 400", async () => {
    mocks.run.mockResolvedValue({
      ok: false,
      error: "invalid_input",
      message: "O limite deve ser positivo.",
    });

    const response = await POST(request({ limit: 0 }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_INVALID_INPUT",
        message: "O limite deve ser positivo.",
      },
    });
  });

  it("rejects malformed JSON before running", async () => {
    const malformed = new Request("http://localhost", { method: "POST", body: "{" });
    const response = await POST(malformed);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "COMMERCIAL_INVALID_JSON" },
    });
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it("does not expose unexpected errors", async () => {
    mocks.run.mockRejectedValue(new Error("private batch database detail"));

    const response = await POST(request({ limit: 10 }));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível processar os marcos pós-ativação vencidos.",
      },
    });
  });
});
