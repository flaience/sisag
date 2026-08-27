import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), get: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/auth/apiAuth", () => ({ requireApiRole: mocks.auth }));
vi.mock("@/modules/units/CompanyUnit.service", () => ({ getCompanyUnit: mocks.get, updateCompanyUnit: mocks.update }));
import { GET, PUT } from "./route";
const context = { params: Promise.resolve({ id: "unit-1" }) };

describe("current company unit API", () => {
  beforeEach(() => vi.clearAllMocks());
  it("scopes a unit read to the authenticated company", async () => {
    mocks.auth.mockResolvedValue({ ok: true, auth: { companyId: "company-a", role: "staff" } });
    mocks.get.mockResolvedValue({ id: "unit-1" });
    const response = await GET(new Request("https://sisag.test") as never, context);
    expect(response.status).toBe(200);
    expect(mocks.get).toHaveBeenCalledWith("company-a", "unit-1");
  });
  it("returns not found instead of exposing another company unit", async () => {
    mocks.auth.mockResolvedValue({ ok: true, auth: { companyId: "company-a", role: "staff" } });
    mocks.get.mockResolvedValue(null);
    expect((await GET(new Request("https://sisag.test") as never, context)).status).toBe(404);
  });
  it("updates a valid unit inside the authenticated company", async () => {
    mocks.auth.mockResolvedValue({ ok: true, auth: { companyId: "company-a", role: "owner" } });
    mocks.update.mockResolvedValue({ id: "unit-1" });
    const request = new Request("https://sisag.test", { method: "PUT", body: JSON.stringify({ code: "centro", name: "Centro" }) });
    expect((await PUT(request as never, context)).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith("company-a", "unit-1", expect.objectContaining({ name: "Centro" }));
  });
});
