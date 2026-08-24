import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ settle: vi.fn(), validate: vi.fn() }));
vi.mock("@/modules/commercial/commercial-post-activation-due-work-settlement.service", () => ({
  settleCommercialPostActivationDueWork: mocks.settle,
}));
vi.mock("@/platform/core/security", () => ({ validateInternalRequest: mocks.validate }));

import { POST } from "./route";

const workId = "53164020-8778-4226-afed-189e8d2333cc";
const workerKey = "worker:saopaulo-1";
const payload = { workId, workerKey, outcome: "completed" };
const request = (body = JSON.stringify(payload)) => new Request(
  "http://localhost/settle-post-activation-due-work",
  { method: "POST", headers: { "content-type": "application/json" }, body },
);

describe("POST commercial settle-post-activation-due-work", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before reading the body", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });
    expect(await POST(request())).toBe(denied);
    expect(mocks.settle).not.toHaveBeenCalled();
  });

  it("returns a completed settlement", async () => {
    mocks.settle.mockResolvedValue({
      ok: true,
      workId,
      outcome: "completed",
      attempts: 1,
      retryable: false,
      nextRetryAt: null,
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        workId,
        outcome: "completed",
        attempts: 1,
        retryable: false,
        nextRetryAt: null,
      },
    });
    expect(mocks.settle).toHaveBeenCalledWith(payload);
  });

  it("returns retry scheduling for a failed settlement", async () => {
    mocks.settle.mockResolvedValue({
      ok: true,
      workId,
      outcome: "failed",
      attempts: 2,
      retryable: true,
      nextRetryAt: "2026-08-23T21:02:00.000Z",
    });
    const response = await POST(request(JSON.stringify({
      workId, workerKey, outcome: "failed", error: "provider_unavailable",
    })));
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: {
        outcome: "failed",
        retryable: true,
        nextRetryAt: "2026-08-23T21:02:00.000Z",
      },
    });
  });

  it("returns durable scheduling for a deferred settlement", async () => {
    mocks.settle.mockResolvedValue({
      ok: true,
      workId,
      outcome: "deferred",
      attempts: 0,
      retryable: false,
      nextRetryAt: null,
      nextAvailableAt: "2026-08-23T21:15:00.000Z",
    });
    const deferredPayload = {
      workId, workerKey, outcome: "deferred", deferSeconds: 900,
    };
    const response = await POST(request(JSON.stringify(deferredPayload)));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        workId,
        outcome: "deferred",
        attempts: 0,
        retryable: false,
        nextRetryAt: null,
        nextAvailableAt: "2026-08-23T21:15:00.000Z",
      },
    });
    expect(mocks.settle).toHaveBeenCalledWith(deferredPayload);
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await POST(request("{"));
    expect(response.status).toBe(400);
    expect(mocks.settle).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid settlement input", async () => {
    mocks.settle.mockResolvedValue({
      ok: false,
      error: "invalid_input",
      message: "Dados para encerramento do trabalho pós-ativação inválidos.",
    });
    const response = await POST(request());
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "COMMERCIAL_INVALID_INPUT" },
    });
  });

  it("returns 404 without exposing lookup details", async () => {
    mocks.settle.mockResolvedValue({
      ok: false,
      error: "work_not_found",
      message: "private lookup detail",
    });
    const response = await POST(request());
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_DUE_WORK_NOT_FOUND",
        message: "Trabalho pós-ativação não encontrado.",
      },
    });
  });

  it.each([
    ["work_not_processing", "COMMERCIAL_DUE_WORK_NOT_PROCESSING"],
    ["claim_not_owned", "COMMERCIAL_DUE_WORK_CLAIM_NOT_OWNED"],
    ["claim_expired", "COMMERCIAL_DUE_WORK_CLAIM_EXPIRED"],
  ])("returns 409 for %s", async (error, code) => {
    mocks.settle.mockResolvedValue({
      ok: false,
      error,
      message: "private claim detail",
    });
    const response = await POST(request());
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code,
        message: "A reivindicação do trabalho pós-ativação não pode ser encerrada.",
      },
    });
  });

  it("does not expose unexpected storage errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.settle.mockRejectedValue(new Error("private database detail"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível encerrar o trabalho pós-ativação.",
      },
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("validates the internal request exactly once", async () => {
    mocks.settle.mockResolvedValue({
      ok: true,
      workId,
      outcome: "completed",
      attempts: 1,
      retryable: false,
      nextRetryAt: null,
    });
    await POST(request());
    expect(mocks.validate).toHaveBeenCalledTimes(1);
    expect(mocks.validate).toHaveBeenCalledWith(expect.any(Request));
  });
});
