import { describe, expect, it } from "vitest";
import { resolveN8nAgentSelectedAppointmentAction } from "./N8nAgentSelectedAppointmentAction";

const appointments = [
  { appointmentId: "first", status: "PENDING" as const, startsAt: "2026-10-31T12:00:00.000Z", serviceNames: ["Consulta"] },
  { appointmentId: "second", status: "CONFIRMED" as const, startsAt: "2026-11-07T13:00:00.000Z", serviceNames: ["Retorno"] },
];
const base = { timeZone: "America/Sao_Paulo", appointments };

describe("n8n agent selected appointment action", () => {
  it.each([
    ["cancele o primeiro", "cancel", "first"],
    ["quero desmarcar o segundo", "cancel", "second"],
    ["remarque o último", "reschedule", "second"],
    ["quero reagendar 31/10 09:00", "reschedule", "first"],
  ] as const)("resolves one trusted target: %s", (text, action, appointmentId) => {
    expect(resolveN8nAgentSelectedAppointmentAction({ ...base, text })).toEqual({ action, appointment: expect.objectContaining({ appointmentId }) });
  });

  it.each([
    "cancele meu agendamento",
    "o primeiro",
    "cancele ou remarque o primeiro",
    "cancele o primeiro ou o segundo",
    "remarque 01/01 10:00",
  ])("fails closed for missing ambiguous or unmatched action: %s", text => {
    expect(resolveN8nAgentSelectedAppointmentAction({ ...base, text })).toBeNull();
  });

  it("never selects beyond the first five trusted candidates", () => {
    const many = Array.from({ length: 6 }, (_, index) => ({ appointmentId: String(index + 1), status: "PENDING" as const, startsAt: "2026-11-" + String(index + 1).padStart(2, "0") + "T12:00:00.000Z", serviceNames: ["Consulta"] }));
    expect(resolveN8nAgentSelectedAppointmentAction({ text: "cancele o quinto", timeZone: "America/Sao_Paulo", appointments: many })?.appointment.appointmentId).toBe("5");
    expect(resolveN8nAgentSelectedAppointmentAction({ text: "cancele 06/11 09:00", timeZone: "America/Sao_Paulo", appointments: many })).toBeNull();
  });
});
