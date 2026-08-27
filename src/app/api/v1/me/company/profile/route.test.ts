import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireApiRole: vi.fn(), get: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/auth/apiAuth", () => ({ requireApiRole: mocks.requireApiRole }));
vi.mock("@/modules/companies/CurrentCompanyProfile.service", () => ({
  getCurrentCompanyProfile: mocks.get,
  updateCurrentCompanyProfile: mocks.update,
}));

import { GET, PUT } from "./route";
const profile = { id: "tenant-a", name: "Empresa A", document: null, address: null, phone: null, email: null, businessType: "clinic" };

describe("current company profile API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects unauthenticated reads", async () => {
    mocks.requireApiRole.mockResolvedValue({ ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) });
    const response = await GET(new Request("https://sisag.test/api/v1/me/company/profile") as never);
    expect(response.status).toBe(401);
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it("reads the authenticated company without accepting an external id", async () => {
    mocks.requireApiRole.mockResolvedValue({ ok: true, auth: { companyId: "tenant-a", role: "staff" } });
    mocks.get.mockResolvedValue(profile);
    const response = await GET(new Request("https://sisag.test/api/v1/me/company/profile?companyId=tenant-b") as never);
    expect(response.status).toBe(200);
    expect(mocks.get).toHaveBeenCalledWith("tenant-a");
  });

  it("updates the authenticated company for an authorized manager", async () => {
    mocks.requireApiRole.mockResolvedValue({ ok: true, auth: { companyId: "tenant-a", role: "owner" } });
    mocks.update.mockResolvedValue(profile);
    const response = await PUT(new Request("https://sisag.test/api/v1/me/company/profile", { method: "PUT", body: JSON.stringify({ name: "Empresa A", businessType: "clinic" }) }) as never);
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith("tenant-a", expect.objectContaining({ name: "Empresa A" }));
  });

  it("rejects invalid profile data before updating", async () => {
    mocks.requireApiRole.mockResolvedValue({ ok: true, auth: { companyId: "tenant-a", role: "admin" } });
    const response = await PUT(new Request("https://sisag.test/api/v1/me/company/profile", { method: "PUT", body: JSON.stringify({ name: "A", email: "invalid" }) }) as never);
    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
