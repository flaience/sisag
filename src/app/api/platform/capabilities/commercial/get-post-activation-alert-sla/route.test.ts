import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), validate: vi.fn() }));
vi.mock(
  "@/modules/commercial/commercial-post-activation-alert-sla-query.service",
  () => ({ listCommercialPostActivationAlertSla: mocks.query }),
);
vi.mock("@/platform/core/security", () => ({ validateInternalRequest: mocks.validate }));

import { GET } from "./route";

const request = () => new Request(
  "http://localhost/get-post-activation-alert-sla",
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
    expect(mocks.query).toHaveBeenCalledWith();
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
