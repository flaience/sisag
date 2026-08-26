import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireApiRole: vi.fn(), listSlots: vi.fn() }));
vi.mock("@/lib/auth/apiAuth", () => ({ requireApiRole: mocks.requireApiRole }));
vi.mock("@/modules/availability/Availability.service", () => ({
  AvailabilityService: { listSlots: mocks.listSlots },
}));

import { GET } from "./route";

const companyId = "23164020-8778-4226-afed-189e8d2333cc";
const foreignId = "53164020-8778-4226-afed-189e8d2333cc";
const serviceId = "63164020-8778-4226-afed-189e8d2333cc";

describe("availability slots tenant boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects requests without an authenticated tenant", async () => {
    mocks.requireApiRole.mockResolvedValue({ ok: false, response: Response.json({}, { status: 401 }) });
    const response = await GET(new Request(`https://sisag.test/api/v1/availability/slots?companyId=${foreignId}`) as never);
    expect(response.status).toBe(401);
    expect(mocks.listSlots).not.toHaveBeenCalled();
  });

  it("uses the session company even when the query is tampered", async () => {
    mocks.requireApiRole.mockResolvedValue({ ok: true, auth: { companyId, role: "admin" } });
    mocks.listSlots.mockResolvedValue({ ok: true, slots: [] });
    const response = await GET(new Request(
      `https://sisag.test/api/v1/availability/slots?companyId=${foreignId}&serviceId=${serviceId}&startTime=2026-08-27T12:00:00.000Z`,
    ) as never);
    expect(response.status).toBe(200);
    expect(mocks.listSlots).toHaveBeenCalledWith(expect.objectContaining({ companyId, serviceId }));
    expect(mocks.listSlots).not.toHaveBeenCalledWith(expect.objectContaining({ companyId: foreignId }));
  });
});
