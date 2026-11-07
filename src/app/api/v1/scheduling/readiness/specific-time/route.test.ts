import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), diagnosis: vi.fn() }));
vi.mock("@/lib/auth/apiAuth", () => ({ requireApiRole: mocks.auth }));
vi.mock("@/modules/scheduling-readiness/SchedulingReadinessSpecificTimeReadModel.service", () => ({ getSchedulingReadinessSpecificTime: mocks.diagnosis }));
import { GET } from "./route";
const companyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", unitId = "11111111-1111-4111-8111-111111111111", serviceId = "22222222-2222-4222-8222-222222222222", professionalId = "33333333-3333-4333-8333-333333333333";
const url = "https://sisag.test/api/v1/scheduling/readiness/specific-time?unitId=" + unitId + "&serviceId=" + serviceId + "&professionalId=" + professionalId + "&date=2026-11-09&time=15%3A00";
describe("scheduling readiness specific time admin API", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ ok: true, auth: { companyId, role: "admin" } }); mocks.diagnosis.mockResolvedValue({ available: false, reason: "outside_assignment", alternatives: [], readOnly: true }); });
  it("derives the company only from the authenticated session", async () => { const response = await GET(new Request(url) as never); expect(response.status).toBe(200); expect(mocks.diagnosis).toHaveBeenCalledWith({ companyId, unitId, serviceId, professionalId, date: "2026-11-09", time: "15:00" }); expect(response.headers.get("cache-control")).toBe("no-store"); });
  it("rejects invalid or extra input before the read model", async () => { const response = await GET(new Request(url + "&companyId=foreign") as never); expect(response.status).toBe(400); expect(mocks.diagnosis).not.toHaveBeenCalled(); });
  it("preserves authorization failures", async () => { mocks.auth.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) }); const response = await GET(new Request(url) as never); expect(response.status).toBe(403); expect(mocks.diagnosis).not.toHaveBeenCalled(); });
});
