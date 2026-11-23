export type ArrivalDayPeriod = "morning" | "afternoon" | "evening" | null;

export type N8nAgentArrivalOrderRequest = {
  attendanceDate: string;
  dayPeriod: ArrivalDayPeriod;
  serviceText: string | null;
};

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9/]+/g, " ").trim().replace(/\s+/g, " ");
const iso = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (value: string, days: number) => { const date = new Date(value + "T12:00:00.000Z"); date.setUTCDate(date.getUTCDate() + days); return iso(date); };

function explicitDate(text: string, referenceDate: string) {
  if (/\bamanha\b/.test(text)) return addDays(referenceDate, 1);
  if (/\bhoje\b/.test(text)) return referenceDate;
  const match = text.match(/(?:^|\s)(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|1[0-2])(?:\/(20\d{2}))?(?:$|\s)/);
  if (!match) return null;
  const day = Number(match[1]); const month = Number(match[2]);
  let year = match[3] ? Number(match[3]) : Number(referenceDate.slice(0, 4));
  let candidate = year + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
  const parsed = new Date(candidate + "T12:00:00.000Z");
  if (parsed.getUTCDate() !== day || parsed.getUTCMonth() + 1 !== month) return null;
  if (!match[3] && candidate < referenceDate) { year += 1; candidate = year + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0"); }
  return candidate;
}

export function parseN8nAgentArrivalOrderRequest(message: string, referenceDate: string): N8nAgentArrivalOrderRequest | null {
  const text = normalize(message);
  const arrivalIntent = /\bordem de chegada\b|\bsem horario marcado\b|\bcomparecer\b|\bpor chegada\b/.test(text);
  if (!arrivalIntent || /\b(cancelar|desmarcar|remarcar|reagendar)\b/.test(text)) return null;
  const attendanceDate = explicitDate(text, referenceDate);
  if (!attendanceDate) return null;
  const dayPeriod: ArrivalDayPeriod = /\bmanha\b/.test(text) ? "morning" : /\btarde\b/.test(text) ? "afternoon" : /\bnoite\b/.test(text) ? "evening" : null;
  const service = text.match(/(?:para|de)\s+([a-z0-9 ]+?)(?:\s+(?:por ordem de chegada|sem horario marcado|hoje|amanha|dia|de manha|a tarde|a noite)|$)/)?.[1]?.trim() ?? null;
  const generic = new Set(["chegada", "ordem de chegada", "horario", "horario marcado", "atendimento"]);
  return { attendanceDate, dayPeriod, serviceText: service && !generic.has(service) ? service : null };
}
