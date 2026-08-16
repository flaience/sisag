import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  requireOperator: vi.fn(),
  query: vi.fn(),
  exportCsv: vi.fn(),
}));
vi.mock("@/lib/supabase-server", () => ({
  getSupabaseServerClient: vi.fn(async () => ({
    auth: { getSession: mocks.session },
  })),
}));
vi.mock("@/lib/auth/requirePlatformOperator", () => ({
  requirePlatformOperator: mocks.requireOperator,
}));
vi.mock("@/modules/commercial/commercial-post-activation-alert-history.service", () => ({
  listCommercialPostActivationAlertHistory: mocks.query,
}));
vi.mock("@/modules/commercial/commercial-post-activation-alert-history-export.service", () => ({
  exportCommercialPostActivationAlertHistoryCsv: mocks.exportCsv,
}));

import { GET } from "./route";

const request = (query = "") => new Request(
  `http://localhost/platform/commercial/post-activation/export${query}`,
);
const data = {
  items: [{ clientName: "Clínica Exemplo" }],
  summary: { acknowledged: 0, resolved: 1, total: 1 },
  invalidRecords: 0,
};

describe("GET platform post-activation alert history export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-16T12:00:00.000Z"));
    mocks.session.mockResolvedValue({
      data: { session: { access_token: "platform-access-token" } },
    });
    mocks.requireOperator.mockResolvedValue({
      userId: "operator-1",
      role: "operator",
    });
    mocks.query.mockResolvedValue({ ok: true, data });
    mocks.exportCsv.mockReturnValue("\uFEFFcsv-content");
  });

  it("requires an authenticated platform operator", async () => {
    await GET(request());

    expect(mocks.requireOperator).toHaveBeenCalledWith("platform-access-token");
    expect(mocks.requireOperator).toHaveBeenCalledTimes(1);
  });

  it("exports the filtered history as a private CSV download", async () => {
    const response = await GET(request("?action=resolved&actorType=human&limit=9"));

    expect(mocks.query).toHaveBeenCalledWith({
      action: "resolved",
      actorType: "human",
      limit: 9,
    });
    expect(mocks.exportCsv).toHaveBeenCalledWith(data.items);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-disposition"))
      .toBe('attachment; filename="sisag-post-activation-alert-history-2026-08-16.csv"');
    await expect(response.text()).resolves.toBe("csv-content");
  });

  it("defaults the export limit to one hundred records", async () => {
    await GET(request());

    expect(mocks.query).toHaveBeenCalledWith({
      action: undefined,
      actorType: undefined,
      limit: 100,
    });
  });

  it("returns 400 for invalid filters", async () => {
    mocks.query.mockResolvedValue({
      ok: false,
      error: "invalid_input",
      message: "Consulta inválida.",
    });

    const response = await GET(request("?limit=invalid"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_INVALID_INPUT",
        message: "Consulta inválida.",
      },
    });
    expect(mocks.exportCsv).not.toHaveBeenCalled();
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
        message: "Não foi possível exportar o histórico dos alertas pós-ativação.",
      },
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
