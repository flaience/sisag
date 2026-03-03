//src/modules/conversation/parsers/datetimeBR.ts
export function parsePtBrDateTime(
  input: string,
  now = new Date(),
): Date | null {
  if (!input) return null;

  const raw = input.trim();

  // normaliza separadores/ruídos comuns
  const s = raw
    .toLowerCase()
    .replace(/\s+às\s+/g, " ")
    .replace(/\s+as\s+/g, " ")
    .replace(/h/g, ":")
    .replace(/[^\d\/:\s]/g, " ") // remove emojis/pontos/virgulas
    .replace(/\s+/g, " ")
    .trim();

  // dd/mm[/yyyy] hh:mm
  const m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\s+(\d{1,2}):(\d{2})$/);
  if (!m) return null;

  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = m[3] ? Number(m[3]) : now.getFullYear();
  const hh = Number(m[4]);
  const min = Number(m[5]);

  if (
    dd < 1 ||
    dd > 31 ||
    mm < 1 ||
    mm > 12 ||
    hh < 0 ||
    hh > 23 ||
    min < 0 ||
    min > 59
  ) {
    return null;
  }

  // cria em horário local do servidor (você está usando SP no projeto)
  const dt = new Date(yyyy, mm - 1, dd, hh, min, 0, 0);

  // valida dia (ex: 31/02)
  if (
    dt.getFullYear() !== yyyy ||
    dt.getMonth() !== mm - 1 ||
    dt.getDate() !== dd ||
    dt.getHours() !== hh ||
    dt.getMinutes() !== min
  ) {
    return null;
  }

  return dt;
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
