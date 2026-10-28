import { describe, expect, it } from "vitest";
import { groundN8nAgentSelectedAppointmentActionDecision } from "./N8nAgentSelectedAppointmentActionDecision";
import type { N8nAgentShadowDecision } from "./N8nAgentShadowDecision.schema";

const fallback = { action: "clarify", toolName: null, toolArguments: null, answerDraft: null, clarificationQuestion: "Como posso ajudar?", confidence: 1, reasonCode: "missing_information" } as N8nAgentShadowDecision;

describe("n8n agent selected appointment action decision", () => {
  for (const text of ["cancele o segundo", "quero desmarcar o primeiro", "remarque o último", "quero reagendar 31/10 09:00"]) it(text, () => expect(groundN8nAgentSelectedAppointmentActionDecision(text, fallback)).toEqual({ action: "request_read_only_tool", toolName: "scheduling.resolve_selected_appointment_action", toolArguments: {}, answerDraft: null, clarificationQuestion: null, confidence: 1, reasonCode: "selected_appointment_action_required" }));
  for (const text of ["cancele meu agendamento", "o primeiro", "quais são meus agendamentos?"]) it("preserva: " + text, () => expect(groundN8nAgentSelectedAppointmentActionDecision(text, fallback)).toBe(fallback));
});
