import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), cancel: vi.fn() }));
vi.mock("@/lib/auth/apiAuth", () => ({ requireApiRole: mocks.auth }));
vi.mock("@/modules/arrival-order/ArrivalIntention.service", () => ({ cancelArrivalIntention: mocks.cancel, ArrivalIntentionError: class extends Error { code = "test"; } }));
import { DELETE } from "./route";

describe("arrival intention cancellation API", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ ok: true, auth: { companyId: "company-a", role: "admin" } }); });
  it("cancels only inside the authenticated company", async () => {
    mocks.cancel.mockResolvedValue({ id: "33333333-3333-4333-8333-333333333333" });
    const response = await DELETE(new Request("https://sisag.test", { method: "DELETE" }) as never, { params: Promise.resolve({ id: "33333333-3333-4333-8333-333333333333" }) });
    expect(response.status).toBe(200);
    expect(mocks.cancel).toHaveBeenCalledWith("company-a", "33333333-3333-4333-8333-333333333333");
  });
});
