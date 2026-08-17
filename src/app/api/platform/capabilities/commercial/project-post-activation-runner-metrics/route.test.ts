import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ project: vi.fn(), validate: vi.fn() }));

vi.mock("@/modules/commercial/commercial-post-activation-runner-metrics.service", () => ({
  projectCommercialPostActivationRunnerMetrics: mocks.project,
}));
vi.mock("@/platform/core/security", () => ({
  validateInternalRequest: mocks.validate,
}));

import { POST } from "./route";

const summary = {
  executedAt: "2026-08-17T01:00:00.000Z",
  scanned: 4,
  due: 2,
  processed: 2,
  failed: 0,
};
const previous = {
  totalRuns: 4,
  successfulRuns: 3,
  failedRuns: 1,
  consecutiveFailedRuns: 1,
  lastRunAt: "2026-08-17T00:45:00.000Z",
  lastSuccessfulRunAt: "2026-08-17T00:30:00.000Z",
  lastFailureAt: "2026-08-17T00:45:00.000Z",
  status: "degraded" as const,
};
const metrics = {
  totalRuns: 5,
  successfulRuns: 4,
  failedRuns: 1,
  consecutiveFailedRuns: 0,
  lastRunAt: summary.executedAt,
  lastSuccessfulRunAt: summary.executedAt,
  lastFailureAt: previous.lastFailureAt,
  status: "healthy" as const,
};

function request(body: unknown) {
  return new Request("http://localhost/project-post-activation-runner-metrics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST commercial project-post-activation-runner-metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before projecting metrics", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });

    expect(await POST(request({ summary, previous }))).toBe(denied);
    expect(mocks.project).not.toHaveBeenCalled();
  });

  it("returns the projected runner metrics", async () => {
    mocks.project.mockReturnValue({ ok: true, metrics });

    const response = await POST(request({ summary, previous }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data: metrics });
    expect(mocks.project).toHaveBeenCalledWith(summary, previous);
  });

  it("supports the first execution without previous metrics", async () => {
    mocks.project.mockReturnValue({ ok: true, metrics });

    await POST(request({ summary }));

    expect(mocks.project).toHaveBeenCalledWith(summary, undefined);
  });

  it("returns 400 for an invalid runner summary", async () => {
    mocks.project.mockReturnValue({
      ok: false,
      error: "invalid_input",
      message: "Resultados processados e falhos não podem superar os vencidos.",
    });

    const response = await POST(request({ summary: { ...summary, due: 1 } }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_INVALID_INPUT",
        message: "Resultados processados e falhos não podem superar os vencidos.",
      },
    });
  });

  it("rejects malformed JSON before projecting metrics", async () => {
    const malformed = new Request("http://localhost", {
      method: "POST",
      body: "{",
    });

    const response = await POST(malformed);

    expect(response.status).toBe(400);
    expect(mocks.project).not.toHaveBeenCalled();
  });

  it("does not expose unexpected errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.project.mockImplementation(() => {
      throw new Error("private runner metrics detail");
    });

    const response = await POST(request({ summary }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível projetar as métricas do executor pós-ativação.",
      },
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("validates the internal request exactly once", async () => {
    mocks.project.mockReturnValue({ ok: true, metrics });

    await POST(request({ summary }));

    expect(mocks.validate).toHaveBeenCalledTimes(1);
    expect(mocks.validate).toHaveBeenCalledWith(expect.any(Request));
  });
});
