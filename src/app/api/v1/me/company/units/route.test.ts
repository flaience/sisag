import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), list: vi.fn(), create: vi.fn() }));
vi.mock("@/lib/auth/apiAuth", () => ({ requireApiRole: mocks.auth }));
vi.mock("@/modules/units/CompanyUnit.service", () => ({ listCompanyUnits: mocks.list, createCompanyUnit: mocks.create }));
import { GET, POST } from "./route";

describe("current company units API", () => {
  beforeEach(() => vi.clearAllMocks());
  it("lists only units from the authenticated company", async () => {
    mocks.auth.mockResolvedValue({ ok: true, auth: { companyId: "company-a", role: "staff" } });
    mocks.list.mockResolvedValue([]);
    const response = await GET(new Request("https://sisag.test/api/v1/me/company/units?companyId=company-b") as never);
    expect(response.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith("company-a");
  });
  it("creates a valid unit for an authorized manager", async () => {
    mocks.auth.mockResolvedValue({ ok: true, auth: { companyId: "company-a", role: "admin" } });
    mocks.create.mockResolvedValue({ id: "unit-1" });
    const response = await POST(new Request("https://sisag.test/api/v1/me/company/units", { method: "POST", body: JSON.stringify({ code: "centro", name: "Centro" }) }) as never);
    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith("company-a", expect.objectContaining({ code: "centro" }));
  });
  it("rejects invalid input before persistence", async () => {
    mocks.auth.mockResolvedValue({ ok: true, auth: { companyId: "company-a", role: "owner" } });
    const response = await POST(new Request("https://sisag.test", { method: "POST", body: JSON.stringify({ code: "bad code", name: "A" }) }) as never);
    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
