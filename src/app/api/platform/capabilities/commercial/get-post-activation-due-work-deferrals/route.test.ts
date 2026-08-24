import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), validate: vi.fn() }));
vi.mock("@/modules/commercial/commercial-post-activation-due-work-deferral-query.service", () => ({
  listCommercialPostActivationDueWorkDeferrals: mocks.query,
}));
vi.mock("@/platform/core/security", () => ({ validateInternalRequest: mocks.validate }));

import { GET } from "./route";

const request = (query = "") => new Request(
  `http://localhost/get-post-activation-due-work-deferrals${query}`,
);
const data = {
  recordedAt: "2026-08-24T20:30:00.000Z",
  status: "degraded",
  total: 1,
  waiting: 1,
  escalated: 0,
  filteredTotal: 1,
  limit: 25,
  offset: 0,
  hasNext: false,
  items: [],
};

describe("GET commercial get-post-activation-due-work-deferrals", () => {
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

  it("returns the default operational deferral view", async () => {
    mocks.query.mockResolvedValue({ ok: true, data });

    const response = await GET(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data });
    expect(mocks.query).toHaveBeenCalledWith({});
  });

  it("forwards state and pagination filters", async () => {
    mocks.query.mockResolvedValue({ ok: true, data });

    await GET(request("?state=escalated&limit=10&offset=20"));
    expect(mocks.query).toHaveBeenCalledWith({
      state: "escalated",
      limit: 10,
      offset: 20,
    });
  });

  it("returns a controlled validation error for malformed filters", async () => {
    mocks.query.mockResolvedValue({
      ok: false,
      error: "invalid_input",
      message: "private validation detail",
    });

    const response = await GET(request("?limit=invalid"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_INVALID_INPUT",
        message: "Filtros para consulta dos adiamentos pós-ativação inválidos.",
      },
    });
  });

  it("does not expose an invalid stored snapshot", async () => {
    mocks.query.mockResolvedValue({
      ok: false,
      error: "invalid_snapshot",
      message: "private snapshot detail",
    });

    const response = await GET(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_INVALID_DUE_WORK_DEFERRAL_SNAPSHOT",
        message: "Os indicadores persistidos de adiamento pós-ativação estão inválidos.",
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
        message: "Não foi possível consultar os adiamentos pós-ativação.",
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
