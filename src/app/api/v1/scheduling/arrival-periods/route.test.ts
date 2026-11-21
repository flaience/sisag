import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), list: vi.fn(), create: vi.fn() }));
vi.mock("@/lib/auth/apiAuth", () => ({ requireApiRole: mocks.auth }));
vi.mock("@/modules/arrival-order/ServiceArrivalPeriod.service", () => ({ listServiceArrivalPeriods: mocks.list, createServiceArrivalPeriod: mocks.create, ServiceArrivalPeriodError: class extends Error {} }));
import { GET, POST } from "./route";

const companyId = "company-a";
const input = { unitId: "11111111-1111-4111-8111-111111111111", serviceId: "22222222-2222-4222-8222-222222222222", weekday: 1, startTime: "08:00", endTime: "12:00", capacity: 30 };

describe("service arrival periods API", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ ok: true, auth: { companyId, role: "admin" } }); });

  it("lists only inside the authenticated company", async () => {
    mocks.list.mockResolvedValue([]);
    const response = await GET(new Request("https://sisag.test/api/v1/scheduling/arrival-periods?companyId=foreign&status=active") as never);
    expect(response.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith(companyId, { status: "active" });
  });

  it("creates only inside the authenticated company", async () => {
    mocks.create.mockResolvedValue({ id: "period-a" });
    const response = await POST(new Request("https://sisag.test", { method: "POST", body: JSON.stringify(input) }) as never);
    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(companyId, expect.objectContaining({ capacity: 30, active: true }));
  });

  it("rejects invalid periods before the service", async () => {
    const response = await POST(new Request("https://sisag.test", { method: "POST", body: JSON.stringify({ ...input, endTime: "07:00" }) }) as never);
    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
