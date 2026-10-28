import { describe, expect, it } from "vitest";
import { createN8nAgentSelectedAppointmentActionProposal } from "./N8nAgentSelectedAppointmentActionProposal";

const appointment = { appointmentId: "22222222-2222-4222-8222-222222222222", status: "CONFIRMED" as const, startsAt: "2026-10-31T12:00:00.000Z", serviceNames: ["Consulta"] };
const base = { correlationId: "wamid.selected-action", text: "cancele o primeiro", appointment, now: new Date("2026-10-28T12:00:00.000Z"), timeZone: "America/Sao_Paulo" };

describe("n8n agent selected appointment action proposal", () => {
  it("creates a closed cancellation proposal for the trusted target", () => {
    expect(createN8nAgentSelectedAppointmentActionProposal({ ...base, action: "cancel" })).toMatchObject({ kind: "booking_cancellation", status: "awaiting_explicit_confirmation", appointment: { appointmentId: appointment.appointmentId }, dispatchAllowed: false, cancellationExecutionAllowed: false });
  });
  it("asks for a new date and time without creating a rescheduling proposal", () => {
    expect(createN8nAgentSelectedAppointmentActionProposal({ ...base, text: "remarque o primeiro", action: "reschedule" })).toMatchObject({ kind: "booking_rescheduling_target", status: "awaiting_new_date_time", appointment: { appointmentId: appointment.appointmentId }, dispatchAllowed: false, reschedulingExecutionAllowed: false });
  });
  it("fails closed for an invalid past or terminal appointment", () => {
    expect(createN8nAgentSelectedAppointmentActionProposal({ ...base, action: "cancel", appointment: { ...appointment, status: "CANCELLED" as never } })).toBeNull();
    expect(createN8nAgentSelectedAppointmentActionProposal({ ...base, action: "reschedule", appointment: { ...appointment, startsAt: "2026-10-20T12:00:00.000Z" } })).toBeNull();
  });
});
