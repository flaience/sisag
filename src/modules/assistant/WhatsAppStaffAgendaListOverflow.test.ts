import { describe, expect, it, vi } from "vitest";
import { readWhatsAppStaffAgenda, type StaffAgendaAppointment, type StaffAgendaReadDependencies } from "./staff/WhatsAppStaffAgendaReadModel.service";
import { composeStaffAgendaReply } from "./staff/WhatsAppStaffAgendaQueryHandler.service";

const companyId = "9af03377-1d22-40be-9460-dbe07b2709d5";
const now = new Date("2026-10-02T13:00:00.000Z");

function rows(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    bookingId: "booking-" + index,
    startTime: new Date(Date.UTC(2026, 9, 3, 12 + index, 0)).toISOString(),
    endTime: new Date(Date.UTC(2026, 9, 3, 12 + index, 30)).toISOString(),
    clientName: "Cliente " + index,
    serviceName: "Consulta",
    professionalId: "professional-1",
    professionalName: "Profissional Teste",
    status: "CONFIRMED",
  }));
}

function dependencies(total: number, detailed = 20): StaffAgendaReadDependencies {
  return {
    loadTimeZone: vi.fn().mockResolvedValue("America/Sao_Paulo"),
    loadAppointmentCount: vi.fn().mockResolvedValue(total),
    loadAppointments: vi.fn().mockResolvedValue(rows(detailed)),
  };
}

describe("WhatsApp staff agenda list overflow", () => {
  it("loads aggregate count and details together for a day agenda", async () => {
    const deps = dependencies(37);
    const model = await readWhatsAppStaffAgenda({
      identity: { role: "manager", companyId, phoneE164: "+5554999999999" },
      query: { kind: "day_agenda", period: "full_day", day: "tomorrow" },
      now,
    }, deps);

    expect(deps.loadAppointmentCount).toHaveBeenCalledOnce();
    expect(deps.loadAppointments).toHaveBeenCalledWith(expect.objectContaining({ limit: 20 }));
    expect(model.totalCount).toBe(37);
    expect(model.appointments).toHaveLength(20);
  });

  it("reports the exact number beyond the ten visible details", async () => {
    const model = await readWhatsAppStaffAgenda({
      identity: { role: "manager", companyId, phoneE164: "+5554999999999" },
      query: { kind: "day_agenda", period: "full_day", day: "tomorrow" },
      now,
    }, dependencies(37));
    const reply = composeStaffAgendaReply(model, "manager");
    expect(reply).toContain("… e mais 27 atendimentos.");
    expect(reply).not.toContain("Cliente 10");
  });

  it("uses singular for one hidden appointment", () => {
    const appointments = rows(10).map((item) => ({ ...item, timeLabel: "03/10/2026, 09:00" })) as StaffAgendaAppointment[];
    const reply = composeStaffAgendaReply({ kind: "day_agenda", period: "morning", day: "tomorrow", timeZone: "America/Sao_Paulo", range: { start: "", end: "" }, appointments, totalCount: 11 }, "professional");
    expect(reply).toContain("… e mais 1 atendimento.");
  });

  it("does not append an overflow message when every item is visible", () => {
    const appointments = rows(3).map((item) => ({ ...item, timeLabel: "03/10/2026, 09:00" })) as StaffAgendaAppointment[];
    const reply = composeStaffAgendaReply({ kind: "day_agenda", period: "morning", day: "tomorrow", timeZone: "America/Sao_Paulo", range: { start: "", end: "" }, appointments, totalCount: 3 }, "professional");
    expect(reply).not.toContain("e mais");
  });
});
