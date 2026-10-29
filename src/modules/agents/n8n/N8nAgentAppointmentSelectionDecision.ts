import type { N8nAgentShadowDecision } from "./N8nAgentShadowDecision.schema";
import { isExplicitN8nAgentAppointmentSelection } from "./N8nAgentAppointmentSelection";

function normalized(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export function isExplicitN8nAgentAppointmentSelectionDecision(text: string) {
  if (!isExplicitN8nAgentAppointmentSelection(text)) return false;
  const value = normalized(text);
  if (/\b(cancel|desmarc|remarc|reagend|agendar|marcar|reserv)\w*/.test(value)) return false;
  const ordinal = /(?:^|\s)(?:primeir[oa]|segund[oa]|terceir[oa]|quart[oa]|quint[oa]|ultim[oa])(?:$|\s|[.,!?])/.test(value);
  const contextualAppointmentList = value.includes("solicitacao anterior") && /(?:proximos agendamentos|meus agendamentos|agendamentos:)/.test(value);
  return ordinal || contextualAppointmentList;
}

export function groundN8nAgentAppointmentSelectionDecision(text: string, fallback: N8nAgentShadowDecision): N8nAgentShadowDecision {
  if (!isExplicitN8nAgentAppointmentSelectionDecision(text)) return fallback;
  return { action: "request_read_only_tool", toolName: "scheduling.select_appointment", toolArguments: {}, answerDraft: null, clarificationQuestion: null, confidence: 1, reasonCode: "appointment_selection_required" };
}
