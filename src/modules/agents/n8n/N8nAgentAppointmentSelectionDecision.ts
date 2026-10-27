import type { N8nAgentShadowDecision } from "./N8nAgentShadowDecision.schema";
import { isExplicitN8nAgentAppointmentSelection } from "./N8nAgentAppointmentSelection";

function normalized(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export function isExplicitN8nAgentAppointmentSelectionDecision(text: string) {
  if (!isExplicitN8nAgentAppointmentSelection(text)) return false;
  return !/\b(cancel|desmarc|remarc|reagend|agendar|marcar)\w*/.test(normalized(text));
}

export function groundN8nAgentAppointmentSelectionDecision(text: string, fallback: N8nAgentShadowDecision): N8nAgentShadowDecision {
  if (!isExplicitN8nAgentAppointmentSelectionDecision(text)) return fallback;
  return { action: "request_read_only_tool", toolName: "scheduling.select_appointment", toolArguments: {}, answerDraft: null, clarificationQuestion: null, confidence: 1, reasonCode: "appointment_selection_required" };
}
