import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), update: vi.fn(), deactivate: vi.fn() }));
vi.mock("@/lib/auth/apiAuth", () => ({ requireApiRole: mocks.auth }));
vi.mock("@/modules/arrival-order/ServiceArrivalPeriod.service", () => ({ updateServiceArrivalPeriod: mocks.update, deactivateServiceArrivalPeriod: mocks.deactivate, ServiceArrivalPeriodError: class extends Error {} }));
import { DELETE, PUT } from "./route";

const companyId = "company-a";
const id = "33333333-3333-4333-8333-333333333333";
const context = { params: Promise.resolve({ id }) };
const input = { unitId: "11111111-1111-4111-8111-111111111111", serviceId: "22222222-2222-4222-8222-222222222222", weekday: 1, startTime: "08:00", endTime: "12:00", capacity: null };

describe("service arrival period item API", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ ok: true, auth: { companyId, role: "owner" } }); });

  it("updates inside the authenticated company", async () => {
    mocks.update.mockResolvedValue({ id });
    const response = await PUT(new Request("https://sisag.test", { method: "PUT", body: JSON.stringify(input) }) as never, context);
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(companyId, id, expect.objectContaining({ capacity: null, active: true }));
  });

  it("deactivates without deleting history", async () => {
    mocks.deactivate.mockResolvedValue({ id, active: false });
    const response = await DELETE(new Request("https://sisag.test", { method: "DELETE" }) as never, context);
    expect(response.status).toBe(200);
    expect(mocks.deactivate).toHaveBeenCalledWith(companyId, id);
  });
});
