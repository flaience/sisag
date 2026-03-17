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

  let offset = (asUTC - date.getTime()) / 60_000;

  // ✅ NORMALIZA: evita offsets absurdos por causa da virada de dia
  // (ex.: SP pode virar +1260 em vez de -180 quando cai no dia anterior)
  if (offset > 720) offset -= 1440;
  if (offset < -720) offset += 1440;

  return offset;
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

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getPartsInTz(d: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = fmt.formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value;

  const weekdayStr = get("weekday") ?? "Sun";
  const hourStr = get("hour") ?? "00";
  const minuteStr = get("minute") ?? "00";

  return {
    weekday: WEEKDAY_MAP[weekdayStr] ?? 0,
    hour: Number(hourStr),
    minute: Number(minuteStr),
  };
}

/** Weekday 0-6 no timezone (SP por padrão) */
export function getWeekdayInTz(d: Date, timeZone = DEFAULT_TIMEZONE) {
  return getPartsInTz(d, timeZone).weekday;
}

/** Minutos do dia (0..1439) no timezone (SP por padrão) */
export function getMinutesInTz(d: Date, timeZone = DEFAULT_TIMEZONE) {
  const { hour, minute } = getPartsInTz(d, timeZone);
  return hour * 60 + minute;
}

export function isoUtcToDateIsoInTz(
  isoUtc: string,
  timeZone = DEFAULT_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoUtc));
}

export function isoUtcToHHMMInTz(
  isoUtc: string,
  timeZone = DEFAULT_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoUtc));
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

export function formatTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
