import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), get: vi.fn(), upload: vi.fn(), remove: vi.fn() }));
vi.mock("@/lib/auth/apiAuth", () => ({ requireApiRole: mocks.auth }));
vi.mock("@/modules/companies/CompanyLogo.service", async (original) => ({ ...(await original()), getCompanyLogo: mocks.get, uploadCompanyLogo: mocks.upload, removeCompanyLogo: mocks.remove }));
import { DELETE, GET, POST } from "./route";
describe("company logo API", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ ok: true, auth: { companyId: "company-a", role: "owner" } }); });
  it("reads only the authenticated company logo", async () => { mocks.get.mockResolvedValue({ logoPath: null, logoUrl: null }); expect((await GET(new Request("https://sisag.test") as never)).status).toBe(200); expect(mocks.get).toHaveBeenCalledWith("company-a"); });
  it("uploads a multipart image inside the authenticated company", async () => { const file = new File([new Uint8Array([1])], "logo.png", { type: "image/png" }); mocks.upload.mockResolvedValue({ logoPath: "company-a/logo.png" }); const request = { formData: vi.fn().mockResolvedValue({ get: () => file }) }; expect((await POST(request as never)).status).toBe(201); expect(mocks.upload).toHaveBeenCalledWith("company-a", expect.objectContaining({ contentType: "image/png" })); });
  it("rejects a request without a file", async () => { const response = await POST({ formData: vi.fn().mockResolvedValue({ get: () => null }) } as never); expect(response.status).toBe(400); expect(mocks.upload).not.toHaveBeenCalled(); });
  it("removes only the authenticated company logo", async () => { mocks.remove.mockResolvedValue({ removed: true }); expect((await DELETE(new Request("https://sisag.test") as never)).status).toBe(200); expect(mocks.remove).toHaveBeenCalledWith("company-a"); });
});
