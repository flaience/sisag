import { describe, expect, it, vi } from "vitest";
import { listN8nAgentUpcomingAppointments } from "./N8nAgentUpcomingAppointments.service";

describe("n8n agent upcoming appointments", () => {
  it("uses trusted tenant and normalized sender identity", async () => {
    const lookup = vi.fn().mockResolvedValue([]);
    await listN8nAgentUpcomingAppointments({ companyId: "9af03377-1d22-40be-9460-dbe07b2709d5", senderPhoneE164: "(54) 99205-6187", now: new Date("2026-10-23T12:00:00.000Z") }, lookup);
    expect(lookup).toHaveBeenCalledWith({ companyId: "9af03377-1d22-40be-9460-dbe07b2709d5", senderPhoneE164: "+5554992056187", now: new Date("2026-10-23T12:00:00.000Z"), rowLimit: 25 });
  });

  it("groups services and returns at most five future appointments", async () => {
    const rows = Array.from({ length: 7 }, (_, index) => ({ appointmentId: "00000000-0000-4000-8000-00000000000" + index, status: "PENDING" as const, startsAt: new Date("2026-11-0" + (index + 1) + "T12:00:00.000Z"), serviceName: "Consulta" }));
    rows.splice(1, 0, { ...rows[0], serviceName: "Retorno" });
    const result = await listN8nAgentUpcomingAppointments({ companyId: "company", senderPhoneE164: "+5554992056187", limit: 9 }, vi.fn().mockResolvedValue(rows));
    expect(result.appointments).toHaveLength(5);
    expect(result.appointments[0]).toEqual(expect.objectContaining({ serviceNames: ["Consulta", "Retorno"] }));
  });

  it("returns an empty trusted list without inventing appointments", async () => {
    await expect(listN8nAgentUpcomingAppointments({ companyId: "company", senderPhoneE164: "+5554992056187" }, vi.fn().mockResolvedValue([]))).resolves.toEqual({ ok: true, appointments: [] });
  });
});
