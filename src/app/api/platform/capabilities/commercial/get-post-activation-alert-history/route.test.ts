import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), validate: vi.fn() }));
vi.mock("@/modules/commercial/commercial-post-activation-alert-history.service", () => ({
  listCommercialPostActivationAlertHistory: mocks.query,
}));
vi.mock("@/platform/core/security", () => ({ validateInternalRequest: mocks.validate }));

import { GET } from "./route";

const request = (query = "") => new Request(
  `http://localhost/get-post-activation-alert-history${query}`,
);
const data = {
  items: [{
    idempotencyKey: "platform-alert:request-1",
    alertKey: "onboarding:milestone_overdue:welcome",
    action: "resolved",
    actor: { type: "human", id: "operator-1" },
    actedAt: "2026-08-15T23:24:01.000Z",
    onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
    commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
    clientName: "Clínica Exemplo",
  }],
  summary: { acknowledged: 0, resolved: 1, total: 1 },
  invalidRecords: 0,
  nextCursor: null,
};

describe("GET commercial get-post-activation-alert-history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before querying", async () => {
    const denied = Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    mocks.validate.mockReturnValue({ ok: false, response: denied });

    expect(await GET(request("?action=resolved"))).toBe(denied);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("returns alert history data", async () => {
    mocks.query.mockResolvedValue({ ok: true, data });

    const response = await GET(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data });
    expect(mocks.query).toHaveBeenCalledWith({
      cursor: undefined,
      action: undefined,
      actorType: undefined,
      limit: undefined,
    });
  });

  it("forwards supported filters", async () => {
    mocks.query.mockResolvedValue({ ok: true, data });

    const response = await GET(request("?cursor=page-2&action=resolved&actorType=human&limit=10"));
    expect(response.status).toBe(200);
    expect(mocks.query).toHaveBeenCalledWith({
      cursor: "page-2",
      action: "resolved",
      actorType: "human",
      limit: 10,
    });
  });

  it("returns 400 for invalid filters", async () => {
    mocks.query.mockResolvedValue({
      ok: false,
      error: "invalid_input",
      message: "Consulta do histórico de alertas inválida.",
    });

    const response = await GET(request("?action=unknown&limit=invalid"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_INVALID_INPUT",
        message: "Consulta do histórico de alertas inválida.",
      },
    });
    expect(mocks.query).toHaveBeenCalledWith({
      cursor: undefined,
      action: "unknown",
      actorType: undefined,
      limit: Number.NaN,
    });
  });

  it("does not expose unexpected errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.query.mockRejectedValue(new Error("private alert history database detail"));

    const response = await GET(request("?limit=10"));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_UNKNOWN_ERROR",
        message: "Não foi possível consultar o histórico dos alertas pós-ativação.",
      },
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("validates the internal request exactly once", async () => {
    mocks.query.mockResolvedValue({ ok: true, data });
    await GET(request("?limit=5"));

    expect(mocks.validate).toHaveBeenCalledTimes(1);
    expect(mocks.validate).toHaveBeenCalledWith(expect.any(Request));
  });
});
