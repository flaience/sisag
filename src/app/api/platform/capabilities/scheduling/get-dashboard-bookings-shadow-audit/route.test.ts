import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ observe: vi.fn(), validate: vi.fn() }));

vi.mock("@/modules/dashboard/Dashboard.bookings-shadow-audit", () => ({
  DashboardBookingsShadowAuditService: { observe: mocks.observe },
}));
vi.mock("@/platform/core/security", () => ({
  validateInternalRequest: mocks.validate,
}));

import { GET } from "./route";

const companyId = "23164020-8778-4226-afed-189e8d2333cc";
const request = (query = "") =>
  new Request(
    "http://localhost/get-dashboard-bookings-shadow-audit" + query,
  );

describe("GET scheduling dashboard bookings shadow audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validate.mockReturnValue({ ok: true });
  });

  it("returns authentication failure before observing data", async () => {
    const denied = Response.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
    mocks.validate.mockReturnValue({ ok: false, response: denied });

    expect(await GET(request("?companyId=" + companyId))).toBe(denied);
    expect(mocks.observe).not.toHaveBeenCalled();
  });

  it.each(["", "?companyId=invalid"])(
    "rejects missing or malformed company input",
    async (query) => {
      const response = await GET(request(query));
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        ok: false,
        error: {
          code: "SCHEDULING_INVALID_INPUT",
          message: "A empresa informada para auditoria é inválida.",
        },
      });
      expect(mocks.observe).not.toHaveBeenCalled();
    },
  );

  it("returns the structured comparison for an authorized company", async () => {
    const data = {
      recordedAt: "2026-08-26T18:00:00.000Z",
      matched: false,
      status: "divergent",
      differences: [{ field: "today.total", legacy: 1, bookings: 2 }],
      legacy: {},
      bookings: {},
    };
    mocks.observe.mockResolvedValue(data);

    const response = await GET(request("?companyId=" + companyId));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, data });
    expect(mocks.observe).toHaveBeenCalledWith(companyId);
  });

  it("does not expose internal comparison failures", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mocks.observe.mockRejectedValue(new Error("private database detail"));

    const response = await GET(request("?companyId=" + companyId));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "SCHEDULING_SHADOW_AUDIT_FAILED",
        message: "Não foi possível comparar as fontes do dashboard.",
      },
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("validates the internal request exactly once", async () => {
    mocks.observe.mockResolvedValue({ matched: true, differences: [] });
    const value = request("?companyId=" + companyId);

    await GET(value);
    expect(mocks.validate).toHaveBeenCalledTimes(1);
    expect(mocks.validate).toHaveBeenCalledWith(value);
  });
});
