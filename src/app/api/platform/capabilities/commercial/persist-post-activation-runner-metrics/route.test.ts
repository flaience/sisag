import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ persist: vi.fn(), validate: vi.fn() }));

vi.mock(
  "@/modules/commercial/commercial-post-activation-runner-metrics-persistence.service",
  () => ({ persistCommercialPostActivationRunnerMetrics: mocks.persist }),
);
vi.mock("@/platform/core/security", () => ({
  validateInternalRequest: mocks.validate,
}));

import { POST } from "./route";

const input = {
  runnerKey: "post_activation_due_runner",
  executionKey: "n8n-execution-120",
  summary: {
    executedAt: "2026-08-17T18:00:04.021Z",
    scanned: 1,
    due: 1,
    processed: 1,
    failed: 0,
  },
};
const metrics = {
  totalRuns: 2,
  successfulRuns: 2,
  failedRuns: 0,
  consecutiveFailedRuns: 0,
  lastRunAt: input.summary.executedAt,
  lastSuccessfulRunAt: input.summary.executedAt,
  lastFailureAt: null,
  status: "healthy",
};

function request(body: unknown) {
  return new Request("http://localhost/persist-post-activation-runner-metrics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST commercial persist-post-activation-runner-metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before accessing persistence", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });

    expect(await POST(request(input))).toBe(denied);
    expect(mocks.persist).not.toHaveBeenCalled();
  });

  it("returns the durable projected metrics", async () => {
    mocks.persist.mockResolvedValue({
      ok: true,
      replayed: false,
      runnerKey: input.runnerKey,
      executionKey: input.executionKey,
      metrics,
    });

    const response = await POST(request(input));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        replayed: false,
        runnerKey: input.runnerKey,
        executionKey: input.executionKey,
        metrics,
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
      metrics,
    });

    const response = await POST(request(input));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: { replayed: true, metrics },
    });
  });

  it.each([
    ["invalid_input", 400, "COMMERCIAL_INVALID_INPUT"],
    ["persistence_conflict", 409, "COMMERCIAL_RUNNER_METRICS_CONFLICT"],
  ])("maps %s to HTTP %s", async (error, status, code) => {
    mocks.persist.mockResolvedValue({
      ok: false,
      error,
      message: "Falha controlada.",
    });

    const response = await POST(request(input));

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code, message: "Falha controlada." },
    });
  });

  it("rejects malformed JSON before accessing persistence", async () => {
    const malformed = new Request("http://localhost", {
      method: "POST",
      body: "{",
    });

    const response = await POST(malformed);

    expect(response.status).toBe(400);
    expect(mocks.persist).not.toHaveBeenCalled();
  });

  it("does not expose unexpected errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.persist.mockRejectedValue(new Error("private runner metrics database detail"));

    const response = await POST(request(input));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível persistir as métricas do executor pós-ativação.",
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
      metrics,
    });

    await POST(request(input));

    expect(mocks.validate).toHaveBeenCalledTimes(1);
    expect(mocks.validate).toHaveBeenCalledWith(expect.any(Request));
  });
});
