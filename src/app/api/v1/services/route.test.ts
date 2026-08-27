import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireApiRole: vi.fn(),
  listServicesForCompany: vi.fn(),
}));

vi.mock("@/lib/auth/apiAuth", () => ({ requireApiRole: mocks.requireApiRole }));
vi.mock("@/modules/services/Services.query", () => ({ listServicesForCompany: mocks.listServicesForCompany }));

import { GET } from "./route";

describe("services tenant boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects unauthenticated access before querying services", async () => {
    mocks.requireApiRole.mockResolvedValue({ ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) });
    const response = await GET(new Request("https://sisag.test/api/v1/services?companyId=foreign") as never);
    expect(response.status).toBe(401);
    expect(mocks.listServicesForCompany).not.toHaveBeenCalled();
  });

  it("ignores a foreign company parameter and uses the authenticated company", async () => {
    mocks.requireApiRole.mockResolvedValue({ ok: true, auth: { companyId: "tenant-a", role: "staff" } });
    mocks.listServicesForCompany.mockResolvedValue([{ id: "service-1", name: "Consulta", durationMinutes: 30 }]);
    const response = await GET(new Request("https://sisag.test/api/v1/services?companyId=tenant-b&search=consulta") as never);
    expect(response.status).toBe(200);
    expect(mocks.listServicesForCompany).toHaveBeenCalledWith({ companyId: "tenant-a", search: "consulta" });
    await expect(response.json()).resolves.toEqual({ ok: true, items: [{ id: "service-1", name: "Consulta", durationMinutes: 30 }] });
  });

  it("returns a controlled error without exposing internal details", async () => {
    mocks.requireApiRole.mockResolvedValue({ ok: true, auth: { companyId: "tenant-a", role: "admin" } });
    mocks.listServicesForCompany.mockRejectedValue(new Error("database secret"));
    const response = await GET(new Request("https://sisag.test/api/v1/services") as never);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: "internal_error", message: "Não foi possível carregar os serviços." });
  });
});
