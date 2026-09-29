import { describe, expect, it, vi } from "vitest";
import { readWhatsAppStaffAgenda, type StaffAgendaReadDependencies } from "./WhatsAppStaffAgendaReadModel.service";

const companyId = "9af03377-1d22-40be-9460-dbe07b2709d5";
const professionalId = "6c87792c-8dd2-446f-9731-e2d30306266d";
const now = new Date("2026-09-29T13:00:00.000Z");

function dependencies(rows: any[] = []): StaffAgendaReadDependencies {
  return {
    loadTimeZone: vi.fn().mockResolvedValue("America/Sao_Paulo"),
    loadAppointments: vi.fn().mockResolvedValue(rows),
  };
}

describe("WhatsApp staff agenda read model", () => {
  it("scopes an afternoon query to the current business day and professional", async () => {
    const deps = dependencies();
    const result = await readWhatsAppStaffAgenda({
      identity: { role: "professional", companyId, phoneE164: "+5511999999999", professionalId },
      query: { kind: "day_agenda", period: "afternoon" },
      now,
    }, deps);

    expect(deps.loadAppointments).toHaveBeenCalledWith({
      companyId,
      professionalId,
      start: new Date("2026-09-29T15:00:00.000Z"),
      end: new Date("2026-09-29T21:00:00.000Z"),
      limit: 20,
    });
    expect(result.period).toBe("afternoon");
  });

  it("allows a manager scope without inventing a professional", async () => {
    const deps = dependencies();
    await readWhatsAppStaffAgenda({
      identity: { role: "manager", companyId, phoneE164: "+5511999999999" },
      query: { kind: "day_agenda", period: "full_day" },
      now,
    }, deps);
    expect(deps.loadAppointments).toHaveBeenCalledWith(expect.objectContaining({ companyId, professionalId: null }));
  });

  it("returns only the first future appointment for a next query", async () => {
    const deps = dependencies([{
      bookingId: "booking-1", startTime: "2026-09-29T14:00:00.000Z", endTime: "2026-09-29T14:30:00.000Z",
      clientName: "Cliente Teste", serviceName: "Consulta", professionalId, professionalName: "Profissional Teste", status: "CONFIRMED",
    }]);
    const result = await readWhatsAppStaffAgenda({
      identity: { role: "professional", companyId, phoneE164: "+5511999999999", professionalId },
      query: { kind: "next_appointment" },
      now,
    }, deps);
    expect(deps.loadAppointments).toHaveBeenCalledWith(expect.objectContaining({ start: now, limit: 1 }));
    expect(result.appointments[0]).toMatchObject({ bookingId: "booking-1", timeLabel: "29/09/2026, 11:00" });
  });

  it("does not manufacture appointments when the official reader is empty", async () => {
    const result = await readWhatsAppStaffAgenda({
      identity: { role: "manager", companyId, phoneE164: "+5511999999999" },
      query: { kind: "next_appointment" },
      now,
    }, dependencies());
    expect(result.appointments).toEqual([]);
  });
});
