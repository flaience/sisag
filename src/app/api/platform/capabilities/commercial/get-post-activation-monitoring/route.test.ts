import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), validate: vi.fn() }));
vi.mock("@/modules/commercial/commercial-post-activation-monitoring-query.service", () => ({
  listCommercialPostActivationMonitoring: mocks.query,
}));
vi.mock("@/platform/core/security", () => ({ validateInternalRequest: mocks.validate }));

import { GET } from "./route";

const request = (query = "") => new Request(`http://localhost/get-post-activation-monitoring${query}`);
const data = {
  items: [{
    onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
    commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
    clientName: "Clínica Exemplo",
    clientStatus: "active",
    monitoring: {
      status: "overdue",
      currentMilestone: { code: "welcome" },
    },
  }],
  summary: {
    scheduled: 0,
    waiting: 0,
    overdue: 1,
    escalated: 0,
    completed: 0,
  },
  invalidRecords: 0,
  failures: [],
};

describe("GET commercial get-post-activation-monitoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before querying", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });

    expect(await GET(request("?status=overdue"))).toBe(denied);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("returns the operational monitoring data", async () => {
    mocks.query.mockResolvedValue({ ok: true, data });

    const response = await GET(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data });
    expect(mocks.query).toHaveBeenCalledWith({
      status: undefined,
      limit: undefined,
    });
  });

  it("forwards supported filters", async () => {
    mocks.query.mockResolvedValue({ ok: true, data });

    const response = await GET(request("?status=escalated&limit=10"));
    expect(response.status).toBe(200);
    expect(mocks.query).toHaveBeenCalledWith({
      status: "escalated",
      limit: 10,
    });
  });

  it("lets domain validation reject invalid filters", async () => {
    mocks.query.mockResolvedValue({
      ok: false,
      error: "invalid_input",
      message: "Consulta de monitoramento inválida.",
    });

    const response = await GET(request("?status=unknown&limit=invalid"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_INVALID_INPUT",
        message: "Consulta de monitoramento inválida.",
      },
    });
    expect(mocks.query).toHaveBeenCalledWith({
      status: "unknown",
      limit: Number.NaN,
    });
  });

  it("does not expose unexpected errors", async () => {
    mocks.query.mockRejectedValue(new Error("private monitoring database detail"));

    const response = await GET(request("?limit=10"));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível consultar o monitoramento pós-ativação.",
      },
    });
  });

  it("validates the internal request exactly once", async () => {
    mocks.query.mockResolvedValue({ ok: true, data });
    await GET(request("?limit=5"));
    expect(mocks.validate).toHaveBeenCalledTimes(1);
    expect(mocks.validate).toHaveBeenCalledWith(expect.any(Request));
  });
});
