import { describe, expect, it, vi } from "vitest";
import { readWhatsAppStaffAgenda, type StaffAgendaReadDependencies } from "./staff/WhatsAppStaffAgendaReadModel.service";
import { composeStaffAgendaReply } from "./staff/WhatsAppStaffAgendaQueryHandler.service";

const companyId = "9af03377-1d22-40be-9460-dbe07b2709d5";
const identity = { role: "manager" as const, companyId, phoneE164: "+5554999999999" };
const now = new Date("2026-10-03T13:00:00.000Z");

function dependencies(counts: number[] = []): StaffAgendaReadDependencies {
  let index = 0;
  return {
    loadTimeZone: vi.fn().mockResolvedValue("America/Sao_Paulo"),
    loadAppointmentCount: vi.fn().mockImplementation(async () => counts[index++] ?? 0),
    loadAppointments: vi.fn().mockResolvedValue([]),
  };
}

describe("WhatsApp staff weekly agenda summary", () => {
  it("counts the current Monday through Sunday in business timezone", async () => {
    const deps = dependencies([1, 0, 2, 0, 0, 1, 0]);
    const model = await readWhatsAppStaffAgenda({ identity, query: { kind: "day_summary", period: "full_day", day: "this_week" }, now }, deps);
    expect(deps.loadAppointmentCount).toHaveBeenCalledTimes(7);
    expect(deps.loadAppointmentCount).toHaveBeenNthCalledWith(1, expect.objectContaining({ start: new Date("2026-09-28T03:00:00.000Z"), end: new Date("2026-09-29T03:00:00.000Z") }));
    expect(deps.loadAppointmentCount).toHaveBeenNthCalledWith(7, expect.objectContaining({ start: new Date("2026-10-04T03:00:00.000Z"), end: new Date("2026-10-05T03:00:00.000Z") }));
    expect(model.totalCount).toBe(4);
    expect(composeStaffAgendaReply(model, "manager")).toBe("Há 4 atendimentos na agenda desta semana.");
  });

  it("applies the afternoon window independently to every day next week", async () => {
    const deps = dependencies();
    const model = await readWhatsAppStaffAgenda({ identity, query: { kind: "day_summary", period: "afternoon", day: "next_week" }, now }, deps);
    expect(deps.loadAppointmentCount).toHaveBeenCalledTimes(7);
    expect(deps.loadAppointmentCount).toHaveBeenNthCalledWith(1, expect.objectContaining({ start: new Date("2026-10-05T15:00:00.000Z"), end: new Date("2026-10-05T21:00:00.000Z") }));
    expect(deps.loadAppointmentCount).toHaveBeenNthCalledWith(7, expect.objectContaining({ start: new Date("2026-10-11T15:00:00.000Z"), end: new Date("2026-10-11T21:00:00.000Z") }));
    expect(model).toMatchObject({ day: "next_week", dateIso: "2026-10-05", endDateIso: "2026-10-11" });
  });
});
