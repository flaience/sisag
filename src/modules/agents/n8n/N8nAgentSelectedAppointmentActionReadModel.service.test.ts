import { describe, expect, it, vi } from "vitest";
import { resolveN8nAgentSelectedAppointmentActionReadModel } from "./N8nAgentSelectedAppointmentActionReadModel.service";

const appointments = [
  { appointmentId: "first", status: "PENDING" as const, startsAt: "2026-10-31T12:00:00.000Z", serviceNames: ["Consulta"] },
  { appointmentId: "second", status: "CONFIRMED" as const, startsAt: "2026-11-07T13:00:00.000Z", serviceNames: ["Retorno"] },
];

describe("n8n agent selected appointment action read model", () => {
  it("reads a bounded list from the trusted tenant and sender identity", async () => {
    const trustedList = vi.fn().mockResolvedValue({ ok: true, appointments });
    await resolveN8nAgentSelectedAppointmentActionReadModel({ companyId: "company", senderPhoneE164: "+5554992056187", text: "cancele o segundo", timeZone: "America/Sao_Paulo", now: new Date("2026-10-28T12:00:00.000Z") }, trustedList);
    expect(trustedList).toHaveBeenCalledWith({ companyId: "company", senderPhoneE164: "+5554992056187", now: new Date("2026-10-28T12:00:00.000Z"), limit: 5 });
  });

  it.each([
    ["cancele o segundo", "cancel", "second"],
    ["remarque o primeiro", "reschedule", "first"],
  ] as const)("returns one trusted action and target: %s", async (text, action, appointmentId) => {
    const result = await resolveN8nAgentSelectedAppointmentActionReadModel({ companyId: "company", senderPhoneE164: "+5554992056187", text, timeZone: "America/Sao_Paulo" }, vi.fn().mockResolvedValue({ ok: true, appointments }));
    expect(result).toEqual({ ok: true, status: "resolved", action, appointment: expect.objectContaining({ appointmentId }), candidateCount: 2 });
  });

  it.each(["cancele meu agendamento", "o primeiro", "cancele o primeiro ou o segundo", "remarque 01/01 10:00"])("fails closed without a unique trusted target: %s", async text => {
    const result = await resolveN8nAgentSelectedAppointmentActionReadModel({ companyId: "company", senderPhoneE164: "+5554992056187", text, timeZone: "America/Sao_Paulo" }, vi.fn().mockResolvedValue({ ok: true, appointments }));
    expect(result).toEqual({ ok: true, status: "not_resolved", action: null, appointment: null, candidateCount: 2 });
  });
});
