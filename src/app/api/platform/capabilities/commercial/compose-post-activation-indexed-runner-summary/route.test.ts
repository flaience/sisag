import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ compose: vi.fn(), validate: vi.fn() }));
vi.mock("@/modules/commercial/commercial-post-activation-indexed-runner-summary.service", () => ({
  composeCommercialPostActivationIndexedRunnerSummary: mocks.compose,
}));
vi.mock("@/platform/core/security", () => ({
  validateInternalRequest: mocks.validate,
}));

import { POST } from "./route";

const cursor = "23164020-8778-4226-afed-189e8d2333cc";
const payload = {
  executedAt: "2026-08-25T22:00:00.000Z",
  projection: { scanned: 1, cursor, wrapped: true },
  processing: { claimed: 1, completed: 1 },
  recovery: { recovered: 0 },
};
const summary = {
  source: "indexed",
  executedAt: payload.executedAt,
  cursor,
  wrapped: true,
  scanned: 1,
  due: 1,
  processed: 1,
  waiting: 0,
  completed: 1,
  escalated: 0,
  plansCompleted: 0,
  failed: 0,
  failures: [],
  dueWork: payload.projection,
  recovery: payload.recovery,
  processing: payload.processing,
  projectionScanned: 1,
  status: "healthy",
  reasons: [],
};
const request = (body = JSON.stringify(payload)) => new Request(
  "http://localhost/compose-post-activation-indexed-runner-summary",
  { method: "POST", headers: { "content-type": "application/json" }, body },
);

describe("POST compose post-activation indexed runner summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before reading or composing", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });

    expect(await POST(request())).toBe(denied);
    expect(mocks.compose).not.toHaveBeenCalled();
  });

  it("returns the validated indexed runner summary", async () => {
    mocks.compose.mockReturnValue({ ok: true, summary });

    const response = await POST(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data: summary });
    expect(mocks.compose).toHaveBeenCalledWith(payload);
  });

  it("returns a controlled error for malformed JSON", async () => {
    const response = await POST(request("{"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_INVALID_JSON",
        message: "O corpo da requisição deve conter um JSON válido.",
      },
    });
    expect(mocks.compose).not.toHaveBeenCalled();
  });

  it("does not expose private validation details", async () => {
    mocks.compose.mockReturnValue({
      ok: false,
      error: "invalid_input",
      message: "private invariant detail",
    });

    const response = await POST(request());
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_INVALID_INPUT",
        message: "Resumos do pipeline indexado pós-ativação inválidos.",
      },
    });
  });

  it("does not expose unexpected composition errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.compose.mockImplementation(() => {
      throw new Error("private unexpected detail");
    });

    const response = await POST(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível compor o resumo do pipeline pós-ativação.",
      },
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("validates the internal request exactly once", async () => {
    mocks.compose.mockReturnValue({ ok: true, summary });

    await POST(request());
    expect(mocks.validate).toHaveBeenCalledTimes(1);
    expect(mocks.validate).toHaveBeenCalledWith(expect.any(Request));
  });
});
