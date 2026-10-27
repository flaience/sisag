import { describe, expect, it } from "vitest";
import { createAppointmentSelectionAnswerCandidate } from "./N8nAgentShadowAnswerCandidate";

describe("n8n agent appointment selection answer candidate", () => {
  it("formats only the selected trusted appointment", () => {
    expect(createAppointmentSelectionAnswerCandidate({ ok: true, status: "selected", timeZone: "America/Sao_Paulo", appointment: { status: "PENDING", startsAt: "2026-10-31T12:00:00.000Z", serviceNames: ["Consulta"] } })).toEqual({ kind: "appointment_selection", status: "selected", text: "Você selecionou Consulta de 31/10/2026, 09:00 — aguardando confirmação.", appointmentStatus: "PENDING", startsAt: "2026-10-31T12:00:00.000Z", source: "read_only_tool" });
  });

  it("asks for a selection without inventing an appointment", () => {
    expect(createAppointmentSelectionAnswerCandidate({ ok: true, status: "selection_required", appointment: null, timeZone: "America/Sao_Paulo" })).toMatchObject({ kind: "appointment_selection", status: "selection_required", appointmentStatus: null, startsAt: null });
  });

  it("fails closed for ambiguity invalid data or tool failure", () => {
    expect(createAppointmentSelectionAnswerCandidate({ ok: true, status: "not_found_or_ambiguous", appointment: null, timeZone: "America/Sao_Paulo" }).status).toBe("not_found_or_ambiguous");
    expect(createAppointmentSelectionAnswerCandidate({ ok: true, status: "selected", appointment: { status: "PENDING", startsAt: "invalid", serviceNames: ["segredo"] }, timeZone: "America/Sao_Paulo" }).status).toBe("failed");
    expect(createAppointmentSelectionAnswerCandidate({ ok: false, timeZone: "America/Sao_Paulo" }).status).toBe("failed");
  });
});
