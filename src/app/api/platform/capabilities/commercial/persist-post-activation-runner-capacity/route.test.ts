import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ persist: vi.fn(), validate: vi.fn() }));
vi.mock("@/modules/commercial/commercial-post-activation-runner-capacity-persistence.service", () => ({
  persistCommercialPostActivationRunnerCapacity: mocks.persist,
}));
vi.mock("@/platform/core/security", () => ({ validateInternalRequest: mocks.validate }));

import { POST } from "./route";

const input = {
  runnerKey: "post_activation_due_runner",
  executionKey: "n8n-execution-701",
  startedAt: "2026-08-22T12:00:00.000Z",
  finishedAt: "2026-08-22T12:01:00.000Z",
  scheduleIntervalSeconds: 900,
  targetDurationSeconds: 300,
  batchLimit: 25,
  scanned: 10,
  due: 4,
  processed: 4,
  failed: 0,
};
const capacity = {
  durationMilliseconds: 60000,
  durationSeconds: 60,
  scheduleIntervalSeconds: 900,
  targetDurationSeconds: 300,
  batchLimit: 25,
  scanned: 10,
  due: 4,
  processed: 4,
  failed: 0,
  batchUtilizationPercent: 40,
  processedPerMinute: 4,
  possibleBacklog: false,
  status: "healthy",
  reasons: [],
};

function request(body: unknown = input) {
  return new Request("http://localhost/persist-post-activation-runner-capacity", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST commercial persist-post-activation-runner-capacity", () => {
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

  it("persists the projected capacity snapshot", async () => {
    mocks.persist.mockResolvedValue({
      ok: true,
      replayed: false,
      runnerKey: input.runnerKey,
      executionKey: input.executionKey,
      capacity,
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        replayed: false,
        runnerKey: input.runnerKey,
        executionKey: input.executionKey,
        capacity,
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
      capacity,
    });
    const response = await POST(request());
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: { replayed: true, capacity },
    });
  });

  it.each([
    ["invalid_input", 400, "COMMERCIAL_INVALID_INPUT"],
    ["execution_not_found", 404, "COMMERCIAL_RUNNER_EXECUTION_NOT_FOUND"],
    ["invalid_stored_capacity", 409, "COMMERCIAL_RUNNER_CAPACITY_INVALID"],
    ["persistence_conflict", 409, "COMMERCIAL_RUNNER_CAPACITY_CONFLICT"],
  ])("maps %s to HTTP %s", async (error, status, code) => {
    mocks.persist.mockResolvedValue({ ok: false, error, message: "Falha controlada." });
    const response = await POST(request());
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code, message: "Falha controlada." },
    });
  });

  it("returns 400 for malformed JSON", async () => {
    const malformed = new Request("http://localhost", { method: "POST", body: "{" });
    const response = await POST(malformed);
    expect(response.status).toBe(400);
    expect(mocks.persist).not.toHaveBeenCalled();
  });

  it("does not expose unexpected persistence errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.persist.mockRejectedValue(new Error("private capacity database detail"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível persistir a capacidade do executor pós-ativação.",
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
      capacity,
    });
    await POST(request());
    expect(mocks.validate).toHaveBeenCalledTimes(1);
    expect(mocks.validate).toHaveBeenCalledWith(expect.any(Request));
  });
});
