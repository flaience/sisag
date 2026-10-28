import type { N8nAgentShadowDecision } from "./N8nAgentShadowDecision.schema";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function isExplicitN8nAgentSelectedAppointmentActionDecision(text: string) {
  const value = normalize(text);
  if (value.includes("solicitacao anterior") || value.includes("escolha de horario do cliente") || value.includes("nova data")) return false;
  const action = /\b(cancel\w*|desmarc\w*|remarc\w*|remarqu\w*|reagend\w*)\b/.test(value);
  const selector = /\b(primeir[oa]|segund[oa]|terceir[oa]|quart[oa]|quint[oa]|ultim[oa])\b/.test(value) || /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s+(?:as\s+)?\d{1,2}:\d{2}\b/.test(value);
  return action && selector;
}

export function groundN8nAgentSelectedAppointmentActionDecision(text: string, fallback: N8nAgentShadowDecision): N8nAgentShadowDecision {
  if (!isExplicitN8nAgentSelectedAppointmentActionDecision(text)) return fallback;
  return { action: "request_read_only_tool", toolName: "scheduling.resolve_selected_appointment_action", toolArguments: {}, answerDraft: null, clarificationQuestion: null, confidence: 1, reasonCode: "selected_appointment_action_required" };
}
