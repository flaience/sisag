import { describe, expect, it } from "vitest";
import { groundN8nAgentUpcomingAppointmentsDecision, isExplicitN8nAgentUpcomingAppointmentsIntent } from "./N8nAgentUpcomingAppointmentsDecision";
const fallback = { action: "clarify" as const, toolName: null, toolArguments: null, answerDraft: null, clarificationQuestion: "Como posso ajudar?", confidence: 1, reasonCode: "missing_information" as const };
describe("n8n agent upcoming appointments decision", () => {
  it.each(["Quais são meus próximos agendamentos?", "Liste meus agendamentos futuros", "Quero ver os agendamentos que tenho"])('recognizes explicit plural listing: %s', text => { expect(isExplicitN8nAgentUpcomingAppointmentsIntent(text)).toBe(true); expect(groundN8nAgentUpcomingAppointmentsDecision(text, fallback)).toEqual({ action: "request_read_only_tool", toolName: "scheduling.list_upcoming_appointments", toolArguments: { limit: 5 }, answerDraft: null, clarificationQuestion: null, confidence: 1, reasonCode: "upcoming_appointments_required" }); });
  it.each(["Qual é o status do meu próximo agendamento?", "Quero cancelar meus agendamentos", "Quero remarcar meu agendamento", "Quero agendar uma consulta"])('does not steal other scheduling intents: %s', text => { expect(isExplicitN8nAgentUpcomingAppointmentsIntent(text)).toBe(false); expect(groundN8nAgentUpcomingAppointmentsDecision(text, fallback)).toBe(fallback); });
});
