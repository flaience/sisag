import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ recover: vi.fn(), validate: vi.fn() }));
vi.mock("@/modules/commercial/commercial-post-activation-due-work-recovery.service", () => ({
  recoverCommercialPostActivationDueWork: mocks.recover,
}));
vi.mock("@/platform/core/security", () => ({ validateInternalRequest: mocks.validate }));

import { POST } from "./route";

const workId = "53164020-8778-4226-afed-189e8d2333cc";
const request = (body?: string) => new Request(
  "http://localhost/recover-post-activation-due-work",
  { method: "POST", ...(body === undefined ? {} : { body }) },
);

describe("POST commercial recover-post-activation-due-work", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before reading the body", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });
    expect(await POST(request(JSON.stringify({ limit: 10 })))).toBe(denied);
    expect(mocks.recover).not.toHaveBeenCalled();
  });

  it("returns the bounded recovery summary", async () => {
    const data = {
      recovered: 2,
      retryable: 1,
      exhausted: 1,
      items: [
        {
          workId,
          attempts: 2,
          retryable: true,
          nextRetryAt: "2026-08-23T22:02:00.000Z",
        },
        {
          workId: "63164020-8778-4226-afed-189e8d2333cc",
          attempts: 5,
          retryable: false,
          nextRetryAt: null,
        },
      ],
    };
    mocks.recover.mockResolvedValue({ ok: true, ...data });
    const response = await POST(request(JSON.stringify({ limit: 10 })));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data });
    expect(mocks.recover).toHaveBeenCalledWith({ limit: 10 });
  });

  it("accepts an empty body and uses recovery defaults", async () => {
    mocks.recover.mockResolvedValue({
      ok: true,
      recovered: 0,
      retryable: 0,
      exhausted: 0,
      items: [],
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.recover).toHaveBeenCalledWith({});
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await POST(request("{"));
    expect(response.status).toBe(400);
    expect(mocks.recover).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid recovery input", async () => {
    mocks.recover.mockResolvedValue({
      ok: false,
      error: "invalid_input",
      message: "Dados para recuperação dos trabalhos pós-ativação inválidos.",
    });
    const response = await POST(request(JSON.stringify({ limit: 0 })));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "COMMERCIAL_INVALID_INPUT" },
    });
  });

  it("does not expose inconsistent expired work details", async () => {
    mocks.recover.mockResolvedValue({
      ok: false,
      error: "invalid_expired_work",
      message: "private expired work detail",
    });
    const response = await POST(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_INVALID_EXPIRED_WORK",
        message: "Os trabalhos expirados encontrados estão inconsistentes.",
      },
    });
  });

  it("does not expose unexpected storage errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.recover.mockRejectedValue(new Error("private database detail"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível recuperar os trabalhos pós-ativação expirados.",
      },
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("validates the internal request exactly once", async () => {
    mocks.recover.mockResolvedValue({
      ok: true, recovered: 0, retryable: 0, exhausted: 0, items: [],
    });
    await POST(request());
    expect(mocks.validate).toHaveBeenCalledTimes(1);
    expect(mocks.validate).toHaveBeenCalledWith(expect.any(Request));
  });
});
