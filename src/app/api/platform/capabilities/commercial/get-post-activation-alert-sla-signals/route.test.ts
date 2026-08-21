import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), validate: vi.fn() }));
vi.mock("@/modules/commercial/commercial-post-activation-alert-sla-signal-query.service", () => ({
  listCommercialPostActivationAlertSlaSignals: mocks.query,
}));
vi.mock("@/platform/core/security", () => ({ validateInternalRequest: mocks.validate }));

import { GET } from "./route";

const request = (query = "") => new Request(
  `http://localhost/get-post-activation-alert-sla-signals${query}`,
);
const data = {
  signals: [{ key: "alert-1:sla_resolution_breached" }],
  summary: { total: 1, critical: 1, acknowledgementBreached: 0, resolutionBreached: 1 },
  sourceInvalidRecords: 0,
};

describe("GET commercial get-post-activation-alert-sla-signals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
    mocks.query.mockResolvedValue({ ok: true, data });
  });

  it("returns authentication failure before querying", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });
    expect(await GET(request())).toBe(denied);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("returns actionable SLA signals", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data });
    expect(mocks.query).toHaveBeenCalledWith({
      severity: undefined,
      type: undefined,
      limit: undefined,
    });
  });

  it("forwards supported filters", async () => {
    await GET(request("?severity=critical&type=resolution_breached&limit=10"));
    expect(mocks.query).toHaveBeenCalledWith({
      severity: "critical",
      type: "resolution_breached",
      limit: 10,
    });
  });

  it("returns 400 for invalid filters", async () => {
    mocks.query.mockResolvedValue({
      ok: false,
      error: "invalid_input",
      message: "Filtros dos sinais de SLA dos alertas inválidos.",
    });
    const response = await GET(request("?severity=urgent&limit=invalid"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_INVALID_INPUT",
        message: "Filtros dos sinais de SLA dos alertas inválidos.",
      },
    });
  });

  it("returns a controlled error for invalid source SLA data", async () => {
    mocks.query.mockResolvedValue({ ok: false, error: "invalid_sla_data", message: "private" });
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

  it("returns a controlled error for invalid projected signals", async () => {
    mocks.query.mockResolvedValue({ ok: false, error: "invalid_signal_data", message: "private" });
    const response = await GET(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_INVALID_ALERT_SLA_SIGNAL_DATA",
        message: "Os sinais de SLA dos alertas estão inválidos.",
      },
    });
  });

  it("does not expose unexpected errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.query.mockRejectedValue(new Error("private database detail"));
    const response = await GET(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível consultar os sinais de SLA dos alertas pós-ativação.",
      },
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("validates the internal request exactly once", async () => {
    await GET(request());
    expect(mocks.validate).toHaveBeenCalledTimes(1);
    expect(mocks.validate).toHaveBeenCalledWith(expect.any(Request));
  });
});
