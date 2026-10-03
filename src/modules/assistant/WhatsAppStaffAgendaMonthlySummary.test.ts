import { describe, expect, it, vi } from "vitest";
import { readWhatsAppStaffAgenda, type StaffAgendaReadDependencies } from "./staff/WhatsAppStaffAgendaReadModel.service";
import { composeStaffAgendaReply } from "./staff/WhatsAppStaffAgendaQueryHandler.service";

const companyId = "9af03377-1d22-40be-9460-dbe07b2709d5";
const identity = { role: "manager" as const, companyId, phoneE164: "+5554999999999" };
const now = new Date("2026-10-03T13:00:00.000Z");

function dependencies(count = 0): StaffAgendaReadDependencies {
  return {
    loadTimeZone: vi.fn().mockResolvedValue("America/Sao_Paulo"),
    loadAppointmentCount: vi.fn().mockResolvedValue(count),
    loadAppointments: vi.fn().mockResolvedValue([]),
  };
}

describe("WhatsApp staff monthly agenda summary", () => {
  it("uses one aggregate interval for the current full month", async () => {
    const deps = dependencies(8);
    const model = await readWhatsAppStaffAgenda({ identity, query: { kind: "day_summary", period: "full_day", day: "this_month" }, now }, deps);
    expect(deps.loadAppointmentCount).toHaveBeenCalledTimes(1);
    expect(deps.loadAppointmentCount).toHaveBeenCalledWith(expect.objectContaining({ start: new Date("2026-10-01T03:00:00.000Z"), end: new Date("2026-11-01T03:00:00.000Z") }));
    expect(composeStaffAgendaReply(model, "manager")).toBe("Há 8 atendimentos na agenda deste mês.");
  });

  it("resolves the next month across the year boundary", async () => {
    const deps = dependencies();
    const decemberNow = new Date("2026-12-20T13:00:00.000Z");
    const model = await readWhatsAppStaffAgenda({ identity, query: { kind: "day_summary", period: "full_day", day: "next_month" }, now: decemberNow }, deps);
    expect(deps.loadAppointmentCount).toHaveBeenCalledWith(expect.objectContaining({ start: new Date("2027-01-01T03:00:00.000Z"), end: new Date("2027-02-01T03:00:00.000Z") }));
    expect(model).toMatchObject({ dateIso: "2027-01-01", endDateIso: "2027-01-31" });
  });

  it("resolves a named month and rolls an elapsed month into next year", async () => {
    const deps = dependencies(1);
    const model = await readWhatsAppStaffAgenda({ identity, query: { kind: "day_summary", period: "full_day", day: "specific_month", dateText: "Quantos atendimentos tenho em setembro?" }, now }, deps);
    expect(model).toMatchObject({ dateIso: "2027-09-01", endDateIso: "2027-09-30" });
    expect(composeStaffAgendaReply(model, "manager")).toBe("Há 1 atendimento na agenda de setembro de 2027.");
  });

  it("applies an afternoon window separately to every day of a named month", async () => {
    const deps = dependencies();
    await readWhatsAppStaffAgenda({ identity, query: { kind: "day_summary", period: "afternoon", day: "specific_month", dateText: "Quantos atendimentos tenho em outubro à tarde?" }, now }, deps);
    expect(deps.loadAppointmentCount).toHaveBeenCalledTimes(31);
    expect(deps.loadAppointmentCount).toHaveBeenNthCalledWith(1, expect.objectContaining({ start: new Date("2026-10-01T15:00:00.000Z"), end: new Date("2026-10-01T21:00:00.000Z") }));
  });
});
