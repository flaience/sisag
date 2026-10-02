import { describe, expect, it, vi } from "vitest";
import { readWhatsAppStaffAgenda, type StaffAgendaReadDependencies } from "./staff/WhatsAppStaffAgendaReadModel.service";
import { composeStaffAgendaReply } from "./staff/WhatsAppStaffAgendaQueryHandler.service";

const companyId = "9af03377-1d22-40be-9460-dbe07b2709d5";
const now = new Date("2026-10-02T13:00:00.000Z");

function dependencies(totalCount: number): StaffAgendaReadDependencies {
  return {
    loadTimeZone: vi.fn().mockResolvedValue("America/Sao_Paulo"),
    loadAppointments: vi.fn().mockResolvedValue([]),
    loadAppointmentCount: vi.fn().mockResolvedValue(totalCount),
  };
}

describe("WhatsApp staff agenda aggregate count", () => {
  it("counts in the database without loading the limited appointment list", async () => {
    const deps = dependencies(37);
    const model = await readWhatsAppStaffAgenda({
      identity: { role: "manager", companyId, phoneE164: "+5554999999999" },
      query: { kind: "day_summary", period: "full_day", day: "tomorrow" },
      now,
    }, deps);

    expect(deps.loadAppointmentCount).toHaveBeenCalledWith({
      companyId,
      professionalId: null,
      start: new Date("2026-10-03T03:00:00.000Z"),
      end: new Date("2026-10-04T03:00:00.000Z"),
    });
    expect(deps.loadAppointments).not.toHaveBeenCalled();
    expect(model.totalCount).toBe(37);
    expect(composeStaffAgendaReply(model, "manager")).toBe("Há 37 atendimentos na agenda de amanhã.");
  });

  it("keeps professional scope in the aggregate query", async () => {
    const deps = dependencies(21);
    const model = await readWhatsAppStaffAgenda({
      identity: { role: "professional", companyId, phoneE164: "+5554999999999", professionalId: "professional-1" },
      query: { kind: "day_summary", period: "afternoon", day: "today" },
      now,
    }, deps);

    expect(deps.loadAppointmentCount).toHaveBeenCalledWith(expect.objectContaining({ professionalId: "professional-1" }));
    expect(composeStaffAgendaReply(model, "professional")).toBe("Você tem 21 atendimentos da tarde.");
  });

  it("preserves zero and singular wording", async () => {
    const zero = await readWhatsAppStaffAgenda({ identity: { role: "manager", companyId, phoneE164: "+5554999999999" }, query: { kind: "day_summary", period: "morning", day: "today" }, now }, dependencies(0));
    const one = await readWhatsAppStaffAgenda({ identity: { role: "manager", companyId, phoneE164: "+5554999999999" }, query: { kind: "day_summary", period: "morning", day: "today" }, now }, dependencies(1));
    expect(composeStaffAgendaReply(zero, "manager")).toBe("Não há atendimentos na agenda da manhã.");
    expect(composeStaffAgendaReply(one, "manager")).toBe("Há 1 atendimento na agenda da manhã.");
  });
});
