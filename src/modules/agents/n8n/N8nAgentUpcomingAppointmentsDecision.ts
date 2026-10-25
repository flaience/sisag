import type { N8nAgentShadowDecision } from "./N8nAgentShadowDecision.schema";

function normalized(text: string) { return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }

export function isExplicitN8nAgentUpcomingAppointmentsIntent(text: string) {
  const value = normalized(text);
  if (/\b(cancel|desmarc|remarc|reagend|agendar|marcar)\w*/.test(value)) return false;
  const plural = /\bagendamentos\b/.test(value);
  const ownership = /\b(meus|meu|tenho|possuo)\b/.test(value);
  const listing = /\b(quais|listar|liste|mostrar|mostre|ver|consultar|proximos|futuros)\b/.test(value);
  return plural && ownership && listing;
}

export function groundN8nAgentUpcomingAppointmentsDecision(text: string, fallback: N8nAgentShadowDecision): N8nAgentShadowDecision {
  if (!isExplicitN8nAgentUpcomingAppointmentsIntent(text)) return fallback;
  return { action: "request_read_only_tool", toolName: "scheduling.list_upcoming_appointments", toolArguments: { limit: 5 }, answerDraft: null, clarificationQuestion: null, confidence: 1, reasonCode: "upcoming_appointments_required" };
}
