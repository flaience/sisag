// src/lib/time.ts

/* ==============================
   HORÁRIO (já existente)
============================== */

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function toTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function generateIntervals(
  start: string,
  end: string,
  totalSlot: number,
) {
  const startMin = toMinutes(start);
  const endMin = toMinutes(end);

  const intervals: string[] = [];

  for (let t = startMin; t + totalSlot <= endMin; t += totalSlot) {
    intervals.push(toTimeString(t));
  }

  return intervals;
}

/* ==============================
   TIMEZONE - America/Sao_Paulo
============================== */

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

/**
 * Retorna YYYY-MM-DD "hoje" no timezone configurado.
 */
export function todayDateIso(timeZone = DEFAULT_TIMEZONE): string {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return dtf.format(new Date());
}

/**
 * Adiciona dias a um YYYY-MM-DD.
 */
export function addDaysIso(dateIso: string, days: number): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/**
 * Converte data+hora local (SP) em ISO UTC.
 */
export function zonedDateTimeToUtcISOString(
  dateIso: string,
  time: string,
  timeZone = DEFAULT_TIMEZONE,
): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);

  const utcGuess = Date.UTC(y, m - 1, d, hh, mm, 0);
  const guessDate = new Date(utcGuess);

  const offsetMinutes = getTimeZoneOffsetMinutes(guessDate, timeZone);
  const utc = utcGuess - offsetMinutes * 60_000;

  return new Date(utc).toISOString();
}

/**
 * Retorna offset em minutos do timezone na data.
 */
function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};

  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }

  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );

  return (asUTC - date.getTime()) / 60_000;
}

/**
 * Formata ISO UTC para exibição pt-BR no timezone SP.
 */
export function formatPtBr(
  isoUtc: string,
  timeZone = DEFAULT_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(isoUtc));
}
