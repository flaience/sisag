export type TrustedArrivalPeriodTarget = {
  periodId: string;
  serviceName: string;
  unitName: string;
  startTime: string;
  endTime: string;
  capacity: number | null;
  registered: number;
};

export type ArrivalIntentionProposal = {
  kind: "arrival_intention";
  status: "awaiting_explicit_confirmation";
  draft: { periodId: string; attendanceDate: string; requestId: string };
  text: string;
  period: { periodId: string; attendanceDate: string; serviceName: string; unitName: string; startTime: string; endTime: string };
  dispatchAllowed: false;
  arrivalIntentionExecutionAllowed: false;
};

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
const safe = (value: string, fallback: string) => value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || fallback;
const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const validUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function selectedIndex(message: string, periods: TrustedArrivalPeriodTarget[]) {
  const text = normalize(message);
  const ordinalWords = [["primeiro", "primeira"], ["segundo", "segunda"], ["terceiro", "terceira"], ["quarto", "quarta"], ["quinto", "quinta"]];
  const ordinal = ordinalWords.flatMap((words, index) => words.some(word => new RegExp("(?:^|\\s)" + word + "(?:$|\\s)").test(text)) ? [index] : []);
  if (/(?:^|\s)ultim[oa](?:$|\s)/.test(text)) ordinal.push(periods.length - 1);
  if (ordinal.length === 1 && ordinal[0] >= 0 && ordinal[0] < periods.length) return ordinal[0];
  if (ordinal.length > 0) return null;
  const range = /\bmanha\b/.test(text) ? [0, 720] : /\btarde\b/.test(text) ? [720, 1080] : /\bnoite\b/.test(text) ? [1080, 1440] : null;
  if (!range) return null;
  const matches = periods.flatMap((item, index) => { const [hour, minute] = item.startTime.split(":").map(Number); const value = hour * 60 + minute; return value >= range[0] && value < range[1] ? [index] : []; });
  return matches.length === 1 ? matches[0] : null;
}

export function createN8nAgentArrivalIntentionProposal(input: { message: string; attendanceDate: string; correlationId: string; periods: TrustedArrivalPeriodTarget[] }): ArrivalIntentionProposal | null {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(input.attendanceDate) || !input.correlationId.trim()) return null;
  const periods = input.periods.slice(0, 5).filter(item => validUuid(item.periodId) && validTime(item.startTime) && validTime(item.endTime) && item.endTime > item.startTime && item.registered >= 0 && (item.capacity === null || item.capacity > item.registered));
  const index = selectedIndex(input.message, periods);
  if (index === null) return null;
  const selected = periods[index];
  if (!selected) return null;
  const serviceName = safe(selected.serviceName, "Serviço");
  const unitName = safe(selected.unitName, "Unidade");
  const formattedDate = input.attendanceDate.split("-").reverse().join("/");
  return {
    kind: "arrival_intention",
    status: "awaiting_explicit_confirmation",
    draft: { periodId: selected.periodId, attendanceDate: input.attendanceDate, requestId: "conversation:n8n:arrival:" + input.correlationId + ":" + selected.periodId + ":" + input.attendanceDate },
    text: "Deseja registrar sua intenção de comparecer para " + serviceName + " em " + formattedDate + ", no período das " + selected.startTime + " às " + selected.endTime + ", na unidade " + unitName + "?\n\nIsso não reserva horário nem posição na fila. Responda *SIM* para confirmar ou *NÃO* para desistir.",
    period: { periodId: selected.periodId, attendanceDate: input.attendanceDate, serviceName, unitName, startTime: selected.startTime, endTime: selected.endTime },
    dispatchAllowed: false,
    arrivalIntentionExecutionAllowed: false,
  };
}
