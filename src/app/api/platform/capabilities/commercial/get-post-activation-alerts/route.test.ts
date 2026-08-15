import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), validate: vi.fn() }));
vi.mock("@/modules/commercial/commercial-post-activation-alert-query.service", () => ({
  listCommercialPostActivationAlerts: mocks.query,
}));
vi.mock("@/platform/core/security", () => ({ validateInternalRequest: mocks.validate }));

import { GET } from "./route";

const request = (query = "") => new Request(`http://localhost/get-post-activation-alerts${query}`);
const data = {
  alerts: [{
    key: "onboarding:human_escalation:welcome",
    severity: "critical",
    category: "human_escalation",
    onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
    commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
    clientName: "Clínica Exemplo",
  }],
  summary: { critical: 1, high: 0, total: 1 },
  invalidRecords: 0,
};

describe("GET commercial get-post-activation-alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before querying", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });

    expect(await GET(request("?severity=critical"))).toBe(denied);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("returns operational alert data", async () => {
    mocks.query.mockResolvedValue({ ok: true, data });

    const response = await GET(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data });
    expect(mocks.query).toHaveBeenCalledWith({
      severity: undefined,
      category: undefined,
      limit: undefined,
    });
  });

  it("forwards supported filters", async () => {
    mocks.query.mockResolvedValue({ ok: true, data });

    const response = await GET(request("?severity=critical&category=human_escalation&limit=10"));
    expect(response.status).toBe(200);
    expect(mocks.query).toHaveBeenCalledWith({
      severity: "critical",
      category: "human_escalation",
      limit: 10,
    });
  });

  it("returns 400 for invalid filters", async () => {
    mocks.query.mockResolvedValue({
      ok: false,
      error: "invalid_input",
      message: "Consulta de alertas inválida.",
    });

    const response = await GET(request("?severity=unknown&limit=invalid"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code: "COMMERCIAL_INVALID_INPUT", message: "Consulta de alertas inválida." },
    });
    expect(mocks.query).toHaveBeenCalledWith({
      severity: "unknown",
      category: undefined,
      limit: Number.NaN,
    });
  });

  it("returns 503 when monitoring is unavailable", async () => {
    mocks.query.mockResolvedValue({
      ok: false,
      error: "monitoring_unavailable",
      message: "Não foi possível consultar o monitoramento pós-ativação.",
    });

    const response = await GET(request());
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_MONITORING_UNAVAILABLE",
        message: "Não foi possível consultar o monitoramento pós-ativação.",
      },
    });
  });

  it("returns 500 for invalid monitoring data", async () => {
    mocks.query.mockResolvedValue({
      ok: false,
      error: "invalid_monitoring_data",
      message: "O monitoramento retornou dados inválidos para alertas.",
    });

    const response = await GET(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_INVALID_MONITORING_DATA",
        message: "O monitoramento retornou dados inválidos para alertas.",
      },
    });
  });

  it("does not expose unexpected errors", async () => {
    mocks.query.mockRejectedValue(new Error("private alert database detail"));

    const response = await GET(request("?limit=10"));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível consultar os alertas pós-ativação.",
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
