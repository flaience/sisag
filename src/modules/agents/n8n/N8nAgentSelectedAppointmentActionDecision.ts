import type { N8nAgentShadowDecision } from "./N8nAgentShadowDecision.schema";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function currentTurn(value: string) {
  const markers = ["escolha de horario do cliente:", "escolha do cliente:", "complemento do cliente:", "nova consulta de disponibilidade do cliente:"];
  let start = -1;
  let markerLength = 0;
  for (const marker of markers) {
    const index = value.lastIndexOf(marker);
    if (index > start) { start = index; markerLength = marker.length; }
  }
  return start >= 0 ? value.slice(start + markerLength).trim() : value;
}

export function isExplicitN8nAgentSelectedAppointmentActionDecision(text: string) {
  const value = currentTurn(normalize(text));
  const action = /\b(cancel\w*|desmarc\w*|remarc\w*|remarqu\w*|reagend\w*)\b/.test(value);
  const selector = /\b(primeir[oa]|segund[oa]|terceir[oa]|quart[oa]|quint[oa]|ultim[oa])\b/.test(value) || /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s+(?:as\s+)?\d{1,2}:\d{2}\b/.test(value);
  return action && selector;
}

export function groundN8nAgentSelectedAppointmentActionDecision(text: string, fallback: N8nAgentShadowDecision): N8nAgentShadowDecision {
  if (!isExplicitN8nAgentSelectedAppointmentActionDecision(text)) return fallback;
  return { action: "request_read_only_tool", toolName: "scheduling.resolve_selected_appointment_action", toolArguments: {}, answerDraft: null, clarificationQuestion: null, confidence: 1, reasonCode: "selected_appointment_action_required" };
}
