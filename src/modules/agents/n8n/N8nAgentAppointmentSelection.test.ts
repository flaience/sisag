import { describe, expect, it } from "vitest";
import { isExplicitN8nAgentAppointmentSelection, selectTrustedN8nAgentAppointment } from "./N8nAgentAppointmentSelection";

const appointments = [
  { appointmentId: "appointment-1", status: "PENDING" as const, startsAt: "2026-10-31T12:00:00.000Z", serviceNames: ["Consulta"] },
  { appointmentId: "appointment-2", status: "CONFIRMED" as const, startsAt: "2026-11-02T13:30:00.000Z", serviceNames: ["Retorno"] },
  { appointmentId: "appointment-3", status: "PENDING" as const, startsAt: "2026-11-02T15:00:00.000Z", serviceNames: ["Consulta"] },
];
const input = (text: string) => ({ text, timeZone: "America/Sao_Paulo", appointments });

describe("n8n agent appointment selection", () => {
  it.each([["o primeiro", "appointment-1"], ["quero o segundo", "appointment-2"], ["o último", "appointment-3"]])("selects one displayed ordinal: %s", (text, id) => expect(selectTrustedN8nAgentAppointment(input(text))?.appointmentId).toBe(id));
  it("selects a unique explicit local date and time", () => { expect(selectTrustedN8nAgentAppointment(input("o agendamento de 02/11 às 12:00"))?.appointmentId).toBe("appointment-3"); expect(selectTrustedN8nAgentAppointment(input("31/10/2026"))?.appointmentId).toBe("appointment-1"); });
  it("fails closed for ambiguous date invalid ordinal or multiple selectors", () => { expect(selectTrustedN8nAgentAppointment(input("02/11"))).toBeNull(); expect(selectTrustedN8nAgentAppointment(input("o quinto"))).toBeNull(); expect(selectTrustedN8nAgentAppointment(input("o primeiro ou o segundo"))).toBeNull(); });
  it("rejects unrelated text invalid states duplicate identity and more than five options", () => { expect(isExplicitN8nAgentAppointmentSelection("quero cancelar meu agendamento")).toBe(false); const invalid = [{ ...appointments[0]!, status: "CANCELLED" as never }, { ...appointments[1]!, appointmentId: appointments[0]!.appointmentId }]; expect(selectTrustedN8nAgentAppointment({ ...input("o primeiro"), appointments: invalid })).toBeNull(); });
});
