import { describe, expect, it, vi } from "vitest";
import { prepareN8nAgentBookingReschedulingReadModel } from "./N8nAgentBookingReschedulingReadModel.service";

const now = new Date("2026-10-19T12:00:00.000Z");
const appointment = { appointmentId: "985a8c60-9ec4-4e71-bde4-38d5f82ac46d", status: "PENDING" as const, startsAt: "2026-10-24T11:00:00.000Z", serviceId: "5233d357-2c37-4d88-b943-c27c76fc5942", serviceName: "Consulta" };
const slot = { startsAt: "2026-10-26T12:00:00.000Z", endsAt: "2026-10-26T12:30:00.000Z", serviceId: appointment.serviceId, professionalId: null, unitId: null };
const input = { companyId: "9af03377-1d22-40be-9460-dbe07b2709d5", senderPhoneE164: "+55 (54) 99205-6187", correlationId: "wamid.rescheduling-read-1", dateFrom: "2026-10-20T03:00:00.000Z", dateTo: "2026-10-27T03:00:00.000Z", timeZone: "America/Sao_Paulo", now };

describe("n8n agent booking rescheduling read model", () => {
  it("combines one trusted appointment with slots for the same service", async () => {
    const resolveAppointment = vi.fn().mockResolvedValue({ ok: true, appointment });
    const findAvailableSlots = vi.fn().mockResolvedValue({ ok: true, slots: [slot] });
    await expect(prepareN8nAgentBookingReschedulingReadModel(input, { resolveAppointment, findAvailableSlots })).resolves.toEqual({ ok: true, appointment, slots: [slot] });
    expect(resolveAppointment).toHaveBeenCalledWith({ companyId: input.companyId, senderPhoneE164: "+5554992056187", now });
    expect(findAvailableSlots).toHaveBeenCalledWith(expect.objectContaining({ companyId: input.companyId, correlationId: input.correlationId, serviceId: appointment.serviceId, limit: 20 }));
  });

  it("rejects another service past slots and the unchanged current time", async () => {
    const resolveAppointment = vi.fn().mockResolvedValue({ ok: true, appointment });
    const slots = [slot, { ...slot, serviceId: "other" }, { ...slot, startsAt: appointment.startsAt }, { ...slot, startsAt: "2026-10-18T12:00:00.000Z" }];
    const result = await prepareN8nAgentBookingReschedulingReadModel(input, { resolveAppointment, findAvailableSlots: vi.fn().mockResolvedValue({ ok: true, slots }) });
    expect(result).toEqual({ ok: true, appointment, slots: [slot] });
  });

  it("falls back to the beginning of the same local day when no later slot exists", async () => {
    const exactInput = { ...input, dateFrom: "2026-10-26T18:00:00.000Z", dateTo: "2026-10-27T03:00:00.000Z" };
    const morning = { ...slot, startsAt: "2026-10-26T13:30:00.000Z", endsAt: "2026-10-26T14:00:00.000Z" };
    const findAvailableSlots = vi.fn().mockResolvedValueOnce({ ok: true, slots: [] }).mockResolvedValueOnce({ ok: true, slots: [morning] });
    await expect(prepareN8nAgentBookingReschedulingReadModel(exactInput, { resolveAppointment: vi.fn().mockResolvedValue({ ok: true, appointment }), findAvailableSlots })).resolves.toEqual({ ok: true, appointment, slots: [morning] });
    expect(findAvailableSlots).toHaveBeenNthCalledWith(1, expect.objectContaining({ dateFrom: "2026-10-26T18:00:00.000Z" }));
    expect(findAvailableSlots).toHaveBeenNthCalledWith(2, expect.objectContaining({ dateFrom: "2026-10-26T03:00:00.000Z", dateTo: "2026-10-27T03:00:00.000Z" }));
  });

  it("does not repeat the query when later slots already exist", async () => {
    const findAvailableSlots = vi.fn().mockResolvedValue({ ok: true, slots: [slot] });
    await prepareN8nAgentBookingReschedulingReadModel(input, { resolveAppointment: vi.fn().mockResolvedValue({ ok: true, appointment }), findAvailableSlots });
    expect(findAvailableSlots).toHaveBeenCalledTimes(1);
  });

  it("fails closed without a trusted future active appointment", async () => {
    const findAvailableSlots = vi.fn();
    await expect(prepareN8nAgentBookingReschedulingReadModel(input, { resolveAppointment: vi.fn().mockResolvedValue({ ok: false, error: "appointment_not_found" }), findAvailableSlots })).resolves.toEqual({ ok: false, error: "appointment_not_found" });
    expect(findAvailableSlots).not.toHaveBeenCalled();
  });

  it("rejects excessive or invalid search ranges", async () => {
    const dependencies = { resolveAppointment: vi.fn(), findAvailableSlots: vi.fn() };
    await expect(prepareN8nAgentBookingReschedulingReadModel({ ...input, dateTo: "2027-01-01T03:00:00.000Z" }, dependencies)).resolves.toEqual({ ok: false, error: "invalid_request" });
    expect(dependencies.resolveAppointment).not.toHaveBeenCalled();
  });
});
