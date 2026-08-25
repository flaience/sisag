import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), validate: vi.fn() }));
vi.mock(
  "@/modules/commercial/commercial-post-activation-due-work-projection-audit-query.service",
  () => ({ queryCommercialPostActivationProjectionAudit: mocks.query }),
);
vi.mock("@/platform/core/security", () => ({
  validateInternalRequest: mocks.validate,
}));

import { GET } from "./route";

const request = (query = "") => new Request(
  `http://localhost/get-post-activation-due-work-projection-audit${query}`,
);
const data = {
  recordedAt: "2026-08-25T14:00:00.000Z",
  status: "collecting",
  reasons: ["insufficient_observations"],
  requiredObservations: 8,
  observations: 2,
  matched: 2,
  divergent: 0,
  matchRatePercent: 100,
  firstObservedAt: "2026-08-25T13:30:00.000Z",
  lastObservedAt: "2026-08-25T13:45:00.000Z",
  wrappedObservations: 2,
  projectionFailures: 0,
  synchronized: 2,
  completed: 2,
  differences: {},
};

describe("GET commercial post-activation due work projection audit", () => {
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

  it("returns the default historical audit", async () => {
    mocks.query.mockResolvedValue({ ok: true, data });

    const response = await GET(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data });
    expect(mocks.query).toHaveBeenCalledWith({});
  });

  it("forwards the observation limit", async () => {
    mocks.query.mockResolvedValue({ ok: true, data });

    await GET(request("?limit=48"));
    expect(mocks.query).toHaveBeenCalledWith({ limit: 48 });
  });

  it("returns a controlled validation error for malformed parameters", async () => {
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
        message: "Parâmetros para auditoria da projeção pós-ativação inválidos.",
      },
    });
  });

  it("does not expose an invalid stored history", async () => {
    mocks.query.mockResolvedValue({
      ok: false,
      error: "invalid_history",
      message: "private history detail",
    });

    const response = await GET(request());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMERCIAL_INVALID_PROJECTION_AUDIT_HISTORY",
        message: "O histórico da auditoria de projeção pós-ativação está inválido.",
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
        message: "Não foi possível consultar a auditoria de projeção pós-ativação.",
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
