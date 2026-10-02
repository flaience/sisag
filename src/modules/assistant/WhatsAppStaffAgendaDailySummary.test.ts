import { describe, expect, it, vi } from "vitest";
import { readWhatsAppStaffAgenda, type StaffAgendaReadDependencies, type StaffAgendaReadModel } from "./staff/WhatsAppStaffAgendaReadModel.service";
import { composeStaffAgendaReply } from "./staff/WhatsAppStaffAgendaQueryHandler.service";

const companyId = "9af03377-1d22-40be-9460-dbe07b2709d5";
const now = new Date("2026-10-01T13:00:00.000Z");

function dependencies(count = 0): StaffAgendaReadDependencies {
  const rows = Array.from({ length: count }, (_, index) => ({
    bookingId: "booking-" + index,
    startTime: new Date(Date.UTC(2026, 9, 2, 13 + index, 0)).toISOString(),
    endTime: new Date(Date.UTC(2026, 9, 2, 13 + index, 30)).toISOString(),
    clientName: "Cliente " + index,
    serviceName: "Consulta",
    professionalId: "professional-1",
    professionalName: "Profissional Teste",
    status: "CONFIRMED",
  }));
  return { loadTimeZone: vi.fn().mockResolvedValue("America/Sao_Paulo"), loadAppointments: vi.fn().mockResolvedValue(rows), loadAppointmentCount: vi.fn().mockResolvedValue(count) };
}

describe("WhatsApp staff daily agenda summary", () => {
  it("builds tomorrow range in the business timezone", async () => {
    const deps = dependencies();
    const result = await readWhatsAppStaffAgenda({
      identity: { role: "manager", companyId, phoneE164: "+5554999999999" },
      query: { kind: "day_summary", period: "full_day", day: "tomorrow" },
      now,
    }, deps);
    expect(deps.loadAppointmentCount).toHaveBeenCalledWith({
      companyId,
      professionalId: null,
      start: new Date("2026-10-02T03:00:00.000Z"),
      end: new Date("2026-10-03T03:00:00.000Z"),
    });
    expect(deps.loadAppointments).not.toHaveBeenCalled();
    expect(result).toMatchObject({ kind: "day_summary", period: "full_day", day: "tomorrow" });
  });

  it("reports zero without exposing appointment data", () => {
    const model = { kind: "day_summary", period: "full_day", day: "tomorrow", timeZone: "America/Sao_Paulo", range: { start: "", end: "" }, appointments: [], totalCount: 0 } satisfies StaffAgendaReadModel;
    expect(composeStaffAgendaReply(model, "manager")).toBe("Não há atendimentos na agenda de amanhã.");
  });

  it("uses singular for one professional appointment", async () => {
    const model = await readWhatsAppStaffAgenda({ identity: { role: "professional", companyId, phoneE164: "+5554999999999", professionalId: "professional-1" }, query: { kind: "day_summary", period: "morning", day: "tomorrow" }, now }, dependencies(1));
    expect(composeStaffAgendaReply(model, "professional")).toBe("Você tem 1 atendimento de amanhã pela manhã.");
  });

  it("uses plural for a manager company summary", async () => {
    const model = await readWhatsAppStaffAgenda({ identity: { role: "manager", companyId, phoneE164: "+5554999999999" }, query: { kind: "day_summary", period: "afternoon", day: "tomorrow" }, now }, dependencies(2));
    expect(composeStaffAgendaReply(model, "manager")).toBe("Há 2 atendimentos na agenda de amanhã à tarde.");
  });
});
