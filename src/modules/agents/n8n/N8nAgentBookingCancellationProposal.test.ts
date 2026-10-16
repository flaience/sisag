import { describe, expect, it, vi } from "vitest";
import { createN8nAgentBookingCancellationProposal, isExplicitN8nAgentBookingCancellationIntent } from "./N8nAgentBookingCancellationProposal";

const appointment = { appointmentId: "11111111-1111-4111-8111-111111111111", status: "PENDING", startsAt: "2027-10-17T11:07:00.000Z", serviceName: "Consulta" };
const base = { correlationId: "wamid.cancel-1", text: "Quero cancelar meu próximo agendamento", appointment, now: new Date("2027-10-16T12:00:00.000Z"), format: () => "17/10/2027, 08:07" };

describe("n8n agent booking cancellation proposal", () => {
  it("recognizes only explicit cancellation intent", () => {
    expect(isExplicitN8nAgentBookingCancellationIntent("Quero cancelar meu agendamento")).toBe(true);
    expect(isExplicitN8nAgentBookingCancellationIntent("Qual é o status do meu agendamento?")).toBe(false);
  });

  it("creates a non-executable idempotent proposal from a trusted future appointment", () => {
    expect(createN8nAgentBookingCancellationProposal(base)).toEqual(expect.objectContaining({
      kind: "booking_cancellation",
      status: "awaiting_explicit_confirmation",
      draft: { appointmentId: appointment.appointmentId, requestId: "conversation:n8n:cancellation:wamid.cancel-1:" + appointment.appointmentId },
      dispatchAllowed: false,
      cancellationExecutionAllowed: false,
    }));
  });

  it("asks for an explicit decision without cancelling", () => {
    const proposal = createN8nAgentBookingCancellationProposal(base);
    expect(proposal?.text).toContain("Deseja cancelar Consulta");
    expect(proposal?.text).toContain("*SIM*");
    expect(proposal?.text).toContain("*NÃO*");
  });

  it("rejects expired, terminal, malformed and unrelated requests before formatting", () => {
    const format = vi.fn(() => "never");
    expect(createN8nAgentBookingCancellationProposal({ ...base, text: "Qual é o status?", format })).toBeNull();
    expect(createN8nAgentBookingCancellationProposal({ ...base, appointment: { ...appointment, startsAt: "2027-10-15T11:07:00.000Z" }, format })).toBeNull();
    expect(createN8nAgentBookingCancellationProposal({ ...base, appointment: { ...appointment, status: "CANCELLED" }, format })).toBeNull();
    expect(createN8nAgentBookingCancellationProposal({ ...base, appointment: { ...appointment, appointmentId: "" }, format })).toBeNull();
    expect(format).not.toHaveBeenCalled();
  });
});
