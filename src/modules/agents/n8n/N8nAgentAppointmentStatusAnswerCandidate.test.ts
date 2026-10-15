import { describe, expect, it } from "vitest";
import { createAppointmentStatusAnswerCandidate } from "./N8nAgentShadowAnswerCandidate";

describe("n8n agent appointment status answer candidate", () => {
  it("creates a localized candidate with only safe appointment fields", () => {
    const result = createAppointmentStatusAnswerCandidate({ ok: true, timeZone: "America/Sao_Paulo", journey: { booking: { id: "secret", clientId: "secret", status: "CONFIRMED", startTime: "2026-10-20T12:00:00.000Z", notes: "private" }, items: [{ serviceName: "Consulta" }], client: { name: "Private" } } });
    expect(result).toEqual({ kind: "appointment_status", status: "ready", text: "Seu agendamento para Consulta está confirmado para 20/10/2026, 09:00.", appointmentStatus: "CONFIRMED", startsAt: "2026-10-20T12:00:00.000Z", source: "read_only_tool" });
    expect(JSON.stringify(result)).not.toContain("secret"); expect(JSON.stringify(result)).not.toContain("Private"); expect(JSON.stringify(result)).not.toContain("private");
  });
  it("answers safely when no appointment belongs to the identity", () => expect(createAppointmentStatusAnswerCandidate({ ok: false, errorCode: "SCHEDULING_APPOINTMENT_NOT_FOUND", timeZone: "America/Sao_Paulo" })).toMatchObject({ kind: "appointment_status", status: "not_found", appointmentStatus: null }));
  it("fails closed for malformed journey data", () => expect(createAppointmentStatusAnswerCandidate({ ok: true, journey: {}, timeZone: "America/Sao_Paulo" })).toMatchObject({ status: "failed", startsAt: null }));
});
