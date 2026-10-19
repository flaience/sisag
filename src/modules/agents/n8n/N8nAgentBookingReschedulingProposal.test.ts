import { describe, expect, it } from "vitest";
import { createN8nAgentBookingReschedulingProposal, isExplicitN8nAgentBookingReschedulingIntent } from "./N8nAgentBookingReschedulingProposal";

const now = new Date("2026-10-19T12:00:00.000Z");
const appointment = { appointmentId: "985a8c60-9ec4-4e71-bde4-38d5f82ac46d", status: "PENDING", startsAt: "2026-10-24T11:00:00.000Z", serviceId: "5233d357-2c37-4d88-b943-c27c76fc5942", serviceName: "Consulta" };
const slot = { startsAt: "2026-10-26T12:00:00.000Z", endsAt: "2026-10-26T12:30:00.000Z", serviceId: appointment.serviceId, professionalId: null, unitId: null };
const input = { correlationId: "wamid.reschedule-1", text: "Quero remarcar meu agendamento", appointment, selectedStartTime: slot.startsAt, availableSlots: [slot], now, format: (value: string) => value };

describe("n8n agent booking rescheduling proposal", () => {
  it("recognizes only explicit rescheduling intent", () => {
    expect(isExplicitN8nAgentBookingReschedulingIntent("Quero reagendar minha consulta")).toBe(true);
    expect(isExplicitN8nAgentBookingReschedulingIntent("Quero cancelar minha consulta")).toBe(false);
  });

  it("creates a non-routable and non-executable explicit proposal", () => {
    expect(createN8nAgentBookingReschedulingProposal(input)).toMatchObject({ kind: "booking_rescheduling", status: "awaiting_explicit_confirmation", dispatchAllowed: false, reschedulingExecutionAllowed: false, draft: { appointmentId: appointment.appointmentId, newStartTime: slot.startsAt }, selectedSlot: slot });
  });

  it("rejects an invented ambiguous or mismatched slot", () => {
    expect(createN8nAgentBookingReschedulingProposal({ ...input, selectedStartTime: "2026-10-27T12:00:00.000Z" })).toBeNull();
    expect(createN8nAgentBookingReschedulingProposal({ ...input, availableSlots: [slot, { ...slot }] })).toBeNull();
    expect(createN8nAgentBookingReschedulingProposal({ ...input, availableSlots: [{ ...slot, serviceId: "other" }] })).toBeNull();
  });

  it("rejects past inactive or unchanged appointments", () => {
    expect(createN8nAgentBookingReschedulingProposal({ ...input, appointment: { ...appointment, status: "CANCELLED" } })).toBeNull();
    expect(createN8nAgentBookingReschedulingProposal({ ...input, appointment: { ...appointment, startsAt: "2026-10-18T11:00:00.000Z" } })).toBeNull();
    expect(createN8nAgentBookingReschedulingProposal({ ...input, appointment: { ...appointment, startsAt: slot.startsAt } })).toBeNull();
  });
});
