import { addDaysIso, DEFAULT_TIMEZONE, todayDateIso, zonedDateTimeToUtcISOString } from "@/lib/time";
import type { N8nAgentShadowDecision } from "./N8nAgentShadowDecision.schema";
import { isExplicitN8nAgentBookingReschedulingIntent } from "./N8nAgentBookingReschedulingProposal";

function explicitLocalDate(text: string, receivedAt: Date, timeZone: string) {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const dates = [...normalized.matchAll(/(?:^|[^0-9])(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?(?=$|[^0-9])/g)];
  const times = [...normalized.matchAll(/(?:^|\s)([01]?\d|2[0-3])(?::([0-5]\d)|h(?:([0-5]\d))?)(?=$|\s|[.,!?])/g)];
  if (dates.length !== 1 || times.length !== 1) return null;
  const date = dates[0]!, day = Number(date[1]), month = Number(date[2]);
  let year = date[3] ? Number(date[3]) : Number(todayDateIso(timeZone, receivedAt).slice(0, 4));
  if (year < 100) year += 2000;
  const valid = new Date(Date.UTC(year, month - 1, day));
  if (valid.getUTCFullYear() !== year || valid.getUTCMonth() !== month - 1 || valid.getUTCDate() !== day) return null;
  const hour = String(times[0]![1]).padStart(2, "0"), minute = times[0]![2] ?? times[0]![3] ?? "00";
  let dateIso = String(year).padStart(4, "0") + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
  if (!date[3] && new Date(zonedDateTimeToUtcISOString(dateIso, hour + ":" + minute, timeZone)) <= receivedAt) dateIso = String(year + 1).padStart(4, "0") + dateIso.slice(4);
  return { dateIso, time: hour + ":" + minute };
}

export function groundN8nAgentBookingReschedulingDecision(text: string, receivedAt: Date, decision: N8nAgentShadowDecision, timeZone = DEFAULT_TIMEZONE): N8nAgentShadowDecision {
  if (!isExplicitN8nAgentBookingReschedulingIntent(text)) return decision;
  const explicit = explicitLocalDate(text, receivedAt, timeZone);
  const dateFrom = explicit ? zonedDateTimeToUtcISOString(explicit.dateIso, explicit.time, timeZone) : receivedAt.toISOString();
  const dateTo = explicit ? zonedDateTimeToUtcISOString(addDaysIso(explicit.dateIso, 1), "00:00", timeZone) : new Date(receivedAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  return { action: "request_read_only_tool", toolName: "scheduling.prepare_rescheduling", toolArguments: { dateFrom, dateTo, limit: 20 }, answerDraft: null, clarificationQuestion: null, confidence: 1, reasonCode: "rescheduling_required" };
}
