import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), list: vi.fn(), register: vi.fn() }));
vi.mock("@/lib/auth/apiAuth", () => ({ requireApiRole: mocks.auth }));
vi.mock("@/modules/arrival-order/ArrivalIntention.service", () => ({ listArrivalIntentions: mocks.list, registerArrivalIntention: mocks.register, ArrivalIntentionError: class extends Error { code = "test"; } }));
import { GET, POST } from "./route";

const companyId = "company-a";
const input = { periodId: "11111111-1111-4111-8111-111111111111", clientId: "22222222-2222-4222-8222-222222222222", attendanceDate: "2026-11-23", requestId: "admin:test" };

describe("arrival intentions API", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ ok: true, auth: { companyId, role: "admin" } }); });
  it("lists only inside the authenticated company", async () => {
    mocks.list.mockResolvedValue([]);
    const response = await GET(new Request("https://sisag.test/api/v1/scheduling/arrival-intentions?status=registered") as never);
    expect(response.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith(companyId, { status: "registered" });
  });

  it("rejects a company supplied by the caller", async () => {
    const response = await GET(new Request("https://sisag.test/api/v1/scheduling/arrival-intentions?companyId=foreign") as never);
    expect(response.status).toBe(400);
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it("registers with company and trusted admin source", async () => {
    mocks.register.mockResolvedValue({ id: "intention-a" });
    const response = await POST(new Request("https://sisag.test", { method: "POST", body: JSON.stringify({ ...input, source: "whatsapp" }) }) as never);
    expect(response.status).toBe(400);
    const accepted = await POST(new Request("https://sisag.test", { method: "POST", body: JSON.stringify(input) }) as never);
    expect(accepted.status).toBe(201);
    expect(mocks.register).toHaveBeenCalledWith(companyId, { ...input, source: "admin" });
  });
});
