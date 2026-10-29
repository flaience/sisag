import { describe, expect, it } from "vitest";
import { groundN8nAgentAppointmentSelectionDecision, isExplicitN8nAgentAppointmentSelectionDecision } from "./N8nAgentAppointmentSelectionDecision";

const fallback = { action: "clarify", toolName: null, toolArguments: null, answerDraft: null, clarificationQuestion: "Qual agendamento?", confidence: 1, reasonCode: "missing_information" } as const;

describe("n8n agent appointment selection decision", () => {
  it.each(["o primeiro", "quero o segundo", "o último"])('grounds an explicit trusted-list selection: %s', text => {
    expect(isExplicitN8nAgentAppointmentSelectionDecision(text)).toBe(true);
    expect(groundN8nAgentAppointmentSelectionDecision(text, fallback)).toEqual({ action: "request_read_only_tool", toolName: "scheduling.select_appointment", toolArguments: {}, answerDraft: null, clarificationQuestion: null, confidence: 1, reasonCode: "appointment_selection_required" });
  });

  it("requires trusted appointment-list context for a date", () => {
    const text = "Solicitação anterior: Seus próximos agendamentos: 31/10 09:00\nEscolha do cliente: 31/10 09:00";
    expect(isExplicitN8nAgentAppointmentSelectionDecision(text)).toBe(true);
    expect(groundN8nAgentAppointmentSelectionDecision(text, fallback)).toMatchObject({ toolName: "scheduling.select_appointment", reasonCode: "appointment_selection_required" });
  });

  it.each(["quero remarcar para 31/10 09:00", "cancele o primeiro", "quero marcar o segundo horário", "qual é o status?"])('does not steal a mutation or unrelated intent: %s', text => {
    expect(groundN8nAgentAppointmentSelectionDecision(text, fallback)).toBe(fallback);
  });
});
