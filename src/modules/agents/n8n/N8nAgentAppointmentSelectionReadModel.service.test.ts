import { describe, expect, it, vi } from "vitest";
import { resolveN8nAgentAppointmentSelectionReadModel } from "./N8nAgentAppointmentSelectionReadModel.service";

const appointments = [
  { appointmentId: "first", status: "PENDING" as const, startsAt: "2026-10-31T12:00:00.000Z", serviceNames: ["Consulta"] },
  { appointmentId: "second", status: "CONFIRMED" as const, startsAt: "2026-11-07T13:00:00.000Z", serviceNames: ["Retorno"] },
];

describe("n8n agent appointment selection read model", () => {
  it("reads at most five appointments from the trusted tenant and sender identity", async () => {
    const trustedList = vi.fn().mockResolvedValue({ ok: true, appointments });
    await resolveN8nAgentAppointmentSelectionReadModel({
      companyId: "company",
      senderPhoneE164: "+5554992056187",
      text: "o primeiro",
      timeZone: "America/Sao_Paulo",
      now: new Date("2026-10-26T12:00:00.000Z"),
    }, trustedList);
    expect(trustedList).toHaveBeenCalledWith({ companyId: "company", senderPhoneE164: "+5554992056187", now: new Date("2026-10-26T12:00:00.000Z"), limit: 5 });
  });

  it("returns only the uniquely selected trusted appointment", async () => {
    const result = await resolveN8nAgentAppointmentSelectionReadModel({ companyId: "company", senderPhoneE164: "+5554992056187", text: "quero o segundo", timeZone: "America/Sao_Paulo" }, vi.fn().mockResolvedValue({ ok: true, appointments }));
    expect(result).toEqual({ ok: true, status: "selected", appointment: appointments[1], candidateCount: 2 });
  });

  it("fails closed for missing ambiguous or unmatched selection", async () => {
    const trustedList = vi.fn().mockResolvedValue({ ok: true, appointments });
    await expect(resolveN8nAgentAppointmentSelectionReadModel({ companyId: "company", senderPhoneE164: "+5554992056187", text: "quero remarcar", timeZone: "America/Sao_Paulo" }, trustedList)).resolves.toEqual({ ok: true, status: "selection_required", appointment: null, candidateCount: 2 });
    await expect(resolveN8nAgentAppointmentSelectionReadModel({ companyId: "company", senderPhoneE164: "+5554992056187", text: "o primeiro ou o segundo", timeZone: "America/Sao_Paulo" }, trustedList)).resolves.toEqual({ ok: true, status: "not_found_or_ambiguous", appointment: null, candidateCount: 2 });
  });

  it("uses the configured time zone for an explicit date and time", async () => {
    const result = await resolveN8nAgentAppointmentSelectionReadModel({ companyId: "company", senderPhoneE164: "+5554992056187", text: "31/10 09:00", timeZone: "America/Sao_Paulo" }, vi.fn().mockResolvedValue({ ok: true, appointments }));
    expect(result.status).toBe("selected");
    expect(result.appointment?.appointmentId).toBe("first");
  });
});
