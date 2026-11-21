import { describe, expect, it, vi } from "vitest";
import { cancelArrivalIntention, registerArrivalIntention } from "./ArrivalIntention.service";

const input = { periodId: "11111111-1111-4111-8111-111111111111", clientId: "22222222-2222-4222-8222-222222222222", attendanceDate: "2026-11-23", source: "whatsapp" as const, requestId: "wamid.test" };

describe("arrival intention service boundary", () => {
  it("forwards the authenticated company and idempotent request", async () => {
    const register = vi.fn().mockResolvedValue({});
    await registerArrivalIntention("company-a", input, { register });
    expect(register).toHaveBeenCalledWith("company-a", input);
  });

  it("cancels only inside the authenticated company", async () => {
    const cancel = vi.fn().mockResolvedValue({});
    await cancelArrivalIntention("company-a", "intention-a", { cancel });
    expect(cancel).toHaveBeenCalledWith("company-a", "intention-a");
  });

  it("rejects a missing company boundary", async () => {
    await expect(registerArrivalIntention(" ", input, { register: vi.fn() })).rejects.toThrow("missing_company_id");
  });
});
