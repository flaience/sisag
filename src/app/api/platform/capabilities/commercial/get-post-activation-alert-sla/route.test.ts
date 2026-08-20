import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), validate: vi.fn() }));
vi.mock(
  "@/modules/commercial/commercial-post-activation-alert-sla-query.service",
  () => ({ listCommercialPostActivationAlertSla: mocks.query }),
);
vi.mock("@/platform/core/security", () => ({ validateInternalRequest: mocks.validate }));

import { GET } from "./route";

const request = (query = "") => new Request(
  `http://localhost/get-post-activation-alert-sla${query}`,
);
const data = {
  items: [{
    alertKey: "23164020-8778-4226-afed-189e8d2333cc:milestone_overdue:adoption_d1",
    severity: "high",
    lifecycle: "resolved",
    openedAt: "2026-08-20T12:00:00.000Z",
    acknowledgedAt: "2026-08-20T13:00:00.000Z",
    resolvedAt: "2026-08-20T14:00:00.000Z",
    acknowledgementMinutes: 60,
    resolutionMinutes: 120,
    acknowledgementTargetMinutes: 120,
    resolutionTargetMinutes: 1440,
    acknowledgementBreached: false,
    resolutionBreached: false,
  }],
  summary: {
    total: 1,
    open: 0,
    acknowledged: 0,
    resolved: 1,
    acknowledgementBreached: 0,
    resolutionBreached: 0,
    withinSla: 1,
    complianceRate: 100,
  },
  invalidRecords: 0,
};

describe("GET commercial get-post-activation-alert-sla", () => {
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

  it("returns the durable alert SLA projection", async () => {
    mocks.query.mockResolvedValue({ ok: true, data });

    const response = await GET(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data });
    expect(mocks.query).toHaveBeenCalledWith({
      severity: undefined,
      lifecycle: undefined,
      breach: undefined,
      limit: undefined,
    });
  });

  it("forwards supported SLA filters", async () => {
    mocks.query.mockResolvedValue({ ok: true, data });

    await GET(request(
      "?severity=critical&lifecycle=acknowledged&breach=resolution&limit=25",
    ));

    expect(mocks.query).toHaveBeenCalledWith({
      severity: "critical",
      lifecycle: "acknowledged",
      breach: "resolution",
      limit: 25,
    });
  });

  it("uses the first value for repeated SLA filters", async () => {
    mocks.query.mockResolvedValue({ ok: true, data });

    await GET(request("?severity=high&severity=critical&limit=10&limit=20"));

    expect(mocks.query).toHaveBeenCalledWith({
      severity: "high",
      lifecycle: undefined,
      breach: undefined,
      limit: 10,
    });
  });

  it("returns an empty healthy projection before the first occurrence", async () => {
    const emptyData = {
      items: [],
      summary: {
        total: 0,
        open: 0,
        acknowledged: 0,
        resolved: 0,
        acknowledgementBreached: 0,
        resolutionBreached: 0,
        withinSla: 0,
        complianceRate: 100,
      },
      invalidRecords: 0,
    };
    mocks.query.mockResolvedValue({ ok: true, data: emptyData });

    const response = await GET(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data: emptyData });
  });

  it("returns 400 for invalid SLA filters", async () => {
    mocks.query.mockResolvedValue({
      ok: false,
      error: "invalid_input",
      message: "Filtros de SLA dos alertas inválidos.",
    });

    const response = await GET(request("?severity=urgent&limit=invalid"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_INVALID_INPUT",
        message: "Filtros de SLA dos alertas inválidos.",
      },
    });
    expect(mocks.query).toHaveBeenCalledWith({
      severity: "urgent",
      lifecycle: undefined,
      breach: undefined,
      limit: Number.NaN,
    });
  });

  it("returns a controlled error for inconsistent persisted SLA data", async () => {
    mocks.query.mockResolvedValue({
      ok: false,
      error: "invalid_sla_data",
      message: "private projection detail",
    });

    const response = await GET(request());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_INVALID_ALERT_SLA_DATA",
        message: "Os dados persistidos de SLA dos alertas estão inválidos.",
      },
    });
  });

  it("does not expose unexpected errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.query.mockRejectedValue(new Error("private SLA database detail"));

    const response = await GET(request());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível consultar o SLA dos alertas pós-ativação.",
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
