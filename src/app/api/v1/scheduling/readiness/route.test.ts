import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), readiness: vi.fn() }));
vi.mock("@/lib/auth/apiAuth", () => ({ requireApiRole: mocks.auth }));
vi.mock("@/modules/scheduling-readiness/SchedulingReadinessReadModel.service", () => ({ getSchedulingReadiness: mocks.readiness }));
import { GET } from "./route";

const companyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const unitId = "11111111-1111-4111-8111-111111111111";
const serviceId = "22222222-2222-4222-8222-222222222222";
const professionalId = "33333333-3333-4333-8333-333333333333";

describe("scheduling readiness admin API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ ok: true, auth: { companyId, userId: "user-a", role: "admin" } });
    mocks.readiness.mockResolvedValue({ ready: true, checks: [], warnings: [], readOnly: true });
  });

  it("uses only the company from the authenticated session", async () => {
    const response = await GET(new Request("https://sisag.test/api/v1/scheduling/readiness?unitId=" + unitId + "&serviceId=" + serviceId + "&professionalId=" + professionalId + "&companyId=foreign") as never);
    expect(response.status).toBe(400);
    expect(mocks.readiness).not.toHaveBeenCalled();

    const valid = await GET(new Request("https://sisag.test/api/v1/scheduling/readiness?unitId=" + unitId + "&serviceId=" + serviceId + "&professionalId=" + professionalId) as never);
    expect(valid.status).toBe(200);
    expect(mocks.readiness).toHaveBeenCalledWith({ companyId, unitId, serviceId, professionalId });
    expect(valid.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects incomplete or invalid identifiers before the read model", async () => {
    const response = await GET(new Request("https://sisag.test/api/v1/scheduling/readiness?unitId=" + unitId + "&serviceId=invalid") as never);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, error: "invalid_readiness_query" });
    expect(mocks.readiness).not.toHaveBeenCalled();
  });

  it("preserves the authorization response", async () => {
    mocks.auth.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) });
    const response = await GET(new Request("https://sisag.test/api/v1/scheduling/readiness") as never);
    expect(response.status).toBe(403);
    expect(mocks.readiness).not.toHaveBeenCalled();
  });
});
