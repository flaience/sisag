import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), validate: vi.fn() }));
vi.mock(
  "@/modules/commercial/commercial-post-activation-runner-metrics-query.service",
  () => ({ getCommercialPostActivationRunnerMetrics: mocks.query }),
);
vi.mock("@/platform/core/security", () => ({ validateInternalRequest: mocks.validate }));

import { GET } from "./route";

const request = (query = "") => new Request(
  `http://localhost/get-post-activation-runner-metrics${query}`,
);
const data = {
  runnerKey: "post_activation_due_runner",
  executionKey: "344",
  summary: {
    executedAt: "2026-08-17T20:15:13.046Z",
    scanned: 1,
    due: 1,
    processed: 1,
    failed: 0,
  },
  metrics: {
    totalRuns: 4,
    successfulRuns: 4,
    failedRuns: 0,
    consecutiveFailedRuns: 0,
    lastRunAt: "2026-08-17T20:15:13.046Z",
    lastSuccessfulRunAt: "2026-08-17T20:15:13.046Z",
    lastFailureAt: null,
    status: "healthy",
  },
  executedAt: "2026-08-17T20:15:13.046Z",
};

describe("GET commercial get-post-activation-runner-metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before querying", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });

    expect(await GET(request())).toBe(denied);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("returns the latest durable runner metrics", async () => {
    mocks.query.mockResolvedValue({ ok: true, data });

    const response = await GET(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data });
    expect(mocks.query).toHaveBeenCalledWith({ runnerKey: undefined });
  });

  it("returns null before the first durable execution", async () => {
    mocks.query.mockResolvedValue({ ok: true, data: null });

    const response = await GET(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data: null });
  });

  it("forwards a supported runner key", async () => {
    mocks.query.mockResolvedValue({ ok: true, data });

    await GET(request("?runnerKey=secondary_runner"));

    expect(mocks.query).toHaveBeenCalledWith({ runnerKey: "secondary_runner" });
  });

  it("returns 400 for an invalid runner key", async () => {
    mocks.query.mockResolvedValue({
      ok: false,
      error: "invalid_input",
      message: "Consulta das métricas do runner inválida.",
    });

    const response = await GET(request("?runnerKey=Invalid%20Runner"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_INVALID_INPUT",
        message: "Consulta das métricas do runner inválida.",
      },
    });
  });

  it("returns a controlled error for an invalid stored execution", async () => {
    mocks.query.mockResolvedValue({
      ok: false,
      error: "invalid_stored_run",
      message: "A execução persistida do runner é inválida.",
    });

    const response = await GET(request());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_INVALID_STORED_RUN",
        message: "As métricas persistidas do runner estão inválidas.",
      },
    });
  });

  it("does not expose unexpected errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.query.mockRejectedValue(new Error("private runner metrics database detail"));

    const response = await GET(request());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível consultar as métricas do runner pós-ativação.",
      },
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("validates the internal request exactly once", async () => {
    mocks.query.mockResolvedValue({ ok: true, data });

    await GET(request());

    expect(mocks.validate).toHaveBeenCalledTimes(1);
    expect(mocks.validate).toHaveBeenCalledWith(expect.any(Request));
  });
});
