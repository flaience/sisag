//src/modules/conversation/parsers/datetimeBR.ts
export function parsePtBrDateTime(text: string, now = new Date()): Date | null {
  const t = (text ?? "").toLowerCase().trim();

  const m = t.match(
    /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?.*?(\d{1,2})[:h](\d{2})/,
  );
  if (!m) return null;

  const day = Number(m[1]);
  const month = Number(m[2]);
  const yearRaw = m[3] ? Number(m[3]) : now.getFullYear();
  const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0",
  )}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-03:00`;

  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}
export function parseBRDateTime(input: string, now = new Date()): Date | null {
  const t = input
    .toLowerCase()
    .replace(/às|as/g, " ")
    .replace(/[^\d:\/\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // aceita: 25/02 14:30  |  25/02 1430  |  25/02 14
  const m = t.match(
    /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(\d{1,2})(?::?(\d{2}))?$/,
  );
  if (!m) return null;

  const day = Number(m[1]);
  const month = Number(m[2]);
  const yearRaw = m[3];
  const hour = Number(m[4]);
  const minute = m[5] ? Number(m[5]) : 0;

  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  )
    return null;

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (hour < 0 || hour > 23) return null;
  if (minute < 0 || minute > 59) return null;

  let year = now.getFullYear();
  if (yearRaw) {
    year = yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw);
  }

  // cria em horário local (Brasil) — consistente pro seu ambiente dev
  const dt = new Date(year, month - 1, day, hour, minute, 0, 0);

  // valida overflow (ex: 31/02 vira março)
  if (
    dt.getFullYear() !== year ||
    dt.getMonth() !== month - 1 ||
    dt.getDate() !== day ||
    dt.getHours() !== hour ||
    dt.getMinutes() !== minute
  )
    return null;

  // se data já passou “muito” e não veio ano, assume próximo ano (opcional)
  if (!yearRaw && dt.getTime() < now.getTime() - 60 * 60 * 1000) {
    const next = new Date(year + 1, month - 1, day, hour, minute, 0, 0);
    return next;
  }

  return dt;
}
