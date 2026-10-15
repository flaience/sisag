import { describe, expect, it, vi } from "vitest";
import { resolveN8nAgentAppointmentStatusTarget } from "./N8nAgentAppointmentStatusResolver.service";

const companyId = "9af03377-1d22-40be-9460-dbe07b2709d5";
const appointmentId = "11111111-1111-4111-8111-111111111111";

describe("n8n agent appointment status resolver", () => {
  it("resolves the next appointment from trusted tenant and normalized sender identity", async () => {
    const lookup = vi.fn(async () => ({ appointmentId }));
    await expect(resolveN8nAgentAppointmentStatusTarget({ companyId, senderPhoneE164: "55 (54) 9205-6187", appointmentId: null, now: new Date("2026-10-15T12:00:00Z") }, lookup)).resolves.toEqual({ ok: true, appointmentId });
    expect(lookup).toHaveBeenCalledWith({ companyId, senderPhoneE164: "+5554992056187", appointmentId: null, now: new Date("2026-10-15T12:00:00Z") });
  });

  it("fails closed when no appointment belongs to the trusted identity", async () => {
    await expect(resolveN8nAgentAppointmentStatusTarget({ companyId, senderPhoneE164: "+555492056187", appointmentId }, async () => null)).resolves.toEqual({ ok: false, error: "appointment_not_found" });
  });
});
