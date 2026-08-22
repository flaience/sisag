import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ persist: vi.fn(), validate: vi.fn() }));
vi.mock("@/modules/commercial/commercial-post-activation-runner-fairness-persistence.service", () => ({
  persistCommercialPostActivationRunnerFairness: mocks.persist,
}));
vi.mock("@/platform/core/security", () => ({
  validateInternalRequest: mocks.validate,
}));

import { POST } from "./route";

const cursor = "23164020-8778-4226-afed-189e8d2333cc";
const input = {
  runnerKey: "post_activation_due_runner",
  executionKey: "n8n-execution-902",
  executedAt: "2026-08-22T18:00:00.000Z",
  cursor,
  wrapped: false,
  batchLimit: 25,
  scanned: 25,
};
const fairness = {
  cursor,
  cursorAdvanced: true,
  completedCycles: 2,
  lastCycleCompletedAt: "2026-08-22T17:45:00.000Z",
  consecutiveSaturatedRunsWithoutAdvance: 0,
  status: "healthy",
  reasons: [],
};

function request(body: unknown = input) {
  return new Request("http://localhost/persist-post-activation-runner-fairness", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST commercial persist-post-activation-runner-fairness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before accessing persistence", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });
    expect(await POST(request())).toBe(denied);
    expect(mocks.persist).not.toHaveBeenCalled();
  });

  it("persists the projected fairness snapshot", async () => {
    mocks.persist.mockResolvedValue({
      ok: true,
      replayed: false,
      runnerKey: input.runnerKey,
      executionKey: input.executionKey,
      fairness,
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        replayed: false,
        runnerKey: input.runnerKey,
        executionKey: input.executionKey,
        fairness,
      },
    });
    expect(mocks.persist).toHaveBeenCalledWith(input);
  });

  it("preserves an idempotent replay", async () => {
    mocks.persist.mockResolvedValue({
      ok: true,
      replayed: true,
      runnerKey: input.runnerKey,
      executionKey: input.executionKey,
      fairness,
    });
    const response = await POST(request());
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: { replayed: true, fairness },
    });
  });

  it.each([
    ["invalid_input", 400, "COMMERCIAL_INVALID_INPUT"],
    ["execution_not_found", 404, "COMMERCIAL_RUNNER_EXECUTION_NOT_FOUND"],
    ["invalid_stored_fairness", 409, "COMMERCIAL_RUNNER_FAIRNESS_INVALID"],
    ["persistence_conflict", 409, "COMMERCIAL_RUNNER_FAIRNESS_CONFLICT"],
  ])("maps %s to HTTP %s", async (error, status, code) => {
    mocks.persist.mockResolvedValue({
      ok: false,
      error,
      message: "Falha controlada.",
    });
    const response = await POST(request());
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code, message: "Falha controlada." },
    });
  });

  it("returns 400 for malformed JSON", async () => {
    const malformed = new Request("http://localhost", {
      method: "POST",
      body: "{",
    });
    const response = await POST(malformed);
    expect(response.status).toBe(400);
    expect(mocks.persist).not.toHaveBeenCalled();
  });

  it("does not expose unexpected persistence errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.persist.mockRejectedValue(new Error("private fairness database detail"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível persistir a justiça do executor pós-ativação.",
      },
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("validates the internal request exactly once", async () => {
    mocks.persist.mockResolvedValue({
      ok: true,
      replayed: false,
      runnerKey: input.runnerKey,
      executionKey: input.executionKey,
      fairness,
    });
    await POST(request());
    expect(mocks.validate).toHaveBeenCalledTimes(1);
    expect(mocks.validate).toHaveBeenCalledWith(expect.any(Request));
  });
});
