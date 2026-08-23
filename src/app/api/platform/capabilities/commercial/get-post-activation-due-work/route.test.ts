import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), validate: vi.fn() }));
vi.mock("@/modules/commercial/commercial-post-activation-due-work-query.service", () => ({
  getCommercialPostActivationDueWorkSnapshot: mocks.query,
}));
vi.mock("@/platform/core/security", () => ({ validateInternalRequest: mocks.validate }));

import { GET } from "./route";

const request = () => new Request(
  "http://localhost/get-post-activation-due-work",
);
const data = {
  recordedAt: "2026-08-23T16:00:00.000Z",
  status: "degraded",
  reasons: ["overdue_work"],
  total: 10,
  scheduled: 4,
  processing: 1,
  completed: 5,
  failed: 0,
  claimable: 2,
  overdue: 1,
  expiredLocks: 0,
  totalAttempts: 3,
  oldestOutstandingAt: "2026-08-23T15:00:00.000Z",
  oldestOutstandingAgeSeconds: 3600,
};

describe("GET commercial get-post-activation-due-work", () => {
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

  it("returns the aggregated due-work snapshot", async () => {
    mocks.query.mockResolvedValue({ ok: true, data });

    const response = await GET(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data });
    expect(mocks.query).toHaveBeenCalledWith();
  });

  it("returns a controlled error for an invalid stored snapshot", async () => {
    mocks.query.mockResolvedValue({
      ok: false,
      error: "invalid_snapshot",
      message: "private validation detail",
    });

    const response = await GET(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_INVALID_DUE_WORK_SNAPSHOT",
        message: "Os indicadores persistidos da fila pós-ativação estão inválidos.",
      },
    });
  });

  it("does not expose unexpected storage errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.query.mockRejectedValue(new Error("private database detail"));

    const response = await GET(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível consultar a fila de trabalhos pós-ativação.",
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
