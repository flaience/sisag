import { describe, expect, it, vi } from "vitest";
import { readWhatsAppStaffAgenda, type StaffAgendaReadDependencies } from "./staff/WhatsAppStaffAgendaReadModel.service";
import { composeStaffAgendaReply } from "./staff/WhatsAppStaffAgendaQueryHandler.service";

const companyId = "9af03377-1d22-40be-9460-dbe07b2709d5";
const now = new Date("2026-10-02T13:00:00.000Z");

function dependencies(totalCount = 0): StaffAgendaReadDependencies {
  return {
    loadTimeZone: vi.fn().mockResolvedValue("America/Sao_Paulo"),
    loadAppointmentCount: vi.fn().mockResolvedValue(totalCount),
    loadAppointments: vi.fn().mockResolvedValue([]),
  };
}

describe("WhatsApp staff agenda specific date", () => {
  it("resolves the next Monday in the company timezone", async () => {
    const deps = dependencies();
    const model = await readWhatsAppStaffAgenda({
      identity: { role: "manager", companyId, phoneE164: "+5554999999999" },
      query: { kind: "day_agenda", period: "full_day", day: "specific", dateText: "Como está minha agenda segunda-feira?" },
      now,
    }, deps);
    expect(deps.loadAppointments).toHaveBeenCalledWith(expect.objectContaining({
      start: new Date("2026-10-05T03:00:00.000Z"),
      end: new Date("2026-10-06T03:00:00.000Z"),
    }));
    expect(model).toMatchObject({ day: "specific", dateIso: "2026-10-05" });
  });

  it("resolves a spoken day and period for aggregate count", async () => {
    const deps = dependencies(4);
    const model = await readWhatsAppStaffAgenda({
      identity: { role: "professional", companyId, phoneE164: "+5554999999999", professionalId: "professional-1" },
      query: { kind: "day_summary", period: "afternoon", day: "specific", dateText: "Quantos atendimentos tenho dia cinco à tarde?" },
      now,
    }, deps);
    expect(deps.loadAppointmentCount).toHaveBeenCalledWith(expect.objectContaining({
      professionalId: "professional-1",
      start: new Date("2026-10-05T15:00:00.000Z"),
      end: new Date("2026-10-05T21:00:00.000Z"),
    }));
    expect(composeStaffAgendaReply(model, "professional")).toBe("Você tem 4 atendimentos de 05/10/2026 à tarde.");
  });

  it("formats an empty specific-date agenda without calling it today", async () => {
    const model = await readWhatsAppStaffAgenda({
      identity: { role: "manager", companyId, phoneE164: "+5554999999999" },
      query: { kind: "day_agenda", period: "morning", day: "specific", dateText: "minha agenda segunda-feira de manhã" },
      now,
    }, dependencies());
    expect(composeStaffAgendaReply(model, "manager")).toBe("Não há atendimentos na sua agenda de 05/10/2026 pela manhã.");
  });

  it("fails instead of silently falling back when a marked date cannot be parsed", async () => {
    await expect(readWhatsAppStaffAgenda({
      identity: { role: "manager", companyId, phoneE164: "+5554999999999" },
      query: { kind: "day_agenda", period: "full_day", day: "specific", dateText: "data inválida" },
      now,
    }, dependencies())).rejects.toThrow("invalid_staff_agenda_date");
  });
});
