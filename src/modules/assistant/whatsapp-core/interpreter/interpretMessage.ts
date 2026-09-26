import { DEFAULT_TIMEZONE, todayDateIso, addDaysIso } from "@/lib/time";

export type WhatsAppIntent =
  | "SCHEDULE_REQUEST"
  | "CANCEL_REQUEST"
  | "RESCHEDULE_REQUEST"
  | "HELP"
  | "UNKNOWN";

export type InterpretResult = {
  intent: WhatsAppIntent;
  slots: { dateIso?: string; time?: string };
  confidence: number;
  normalizedText: string;
};
const SPOKEN_HOURS: Record<string, number> = {
  uma: 1, um: 1, duas: 2, dois: 2, três: 3, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezasseis: 16, dezessete: 17, dezassete: 17, dezoito: 18, dezenove: 19, dezanove: 19, vinte: 20, "vinte e uma": 21, "vinte e um": 21, "vinte e duas": 22, "vinte e dois": 22, "vinte e três": 23, "vinte e tres": 23,
};
const SPOKEN_MINUTES: Record<string, number> = { quinze: 15, meia: 30, trinta: 30, "quarenta e cinco": 45 };
const SPOKEN_HOUR_PATTERN = Object.keys(SPOKEN_HOURS).sort((a, b) => b.length - a.length).join("|");

export function parseSpokenTime(text: string): string | undefined {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (/\bmeia[- ]noite\b/.test(normalized)) return "00:00";
  if (/\bmeio[- ]dia\b/.test(normalized)) return "12:00";
  const expression = new RegExp("(?:^|\\s)((?:às?|as|pelas?)\\s+)?(" + SPOKEN_HOUR_PATTERN + ")(?:\\s+(horas?))?(?:\\s+e\\s+(quarenta e cinco|quinze|trinta|meia))?(?:\\s+(da manhã|da manha|da tarde|da noite))?(?=\\s|[.,!?;:]|$)");
  const match = expression.exec(normalized);
  if (!match) return undefined;
  const remainder = normalized.slice(match.index + match[0].length);
  if (/^\s+e\s+\S+/.test(remainder)) return undefined;
  const [, prefix, hourWord, hourMarker, minuteWord, period] = match;
  if (!prefix && !hourMarker && !minuteWord && !period) return undefined;
  let hour = SPOKEN_HOURS[hourWord];
  if (period && /da (tarde|noite)/.test(period) && hour >= 1 && hour <= 11) hour += 12;
  if (period && /da manh[ãa]/.test(period) && hour === 12) hour = 0;
  const minute = minuteWord ? SPOKEN_MINUTES[minuteWord] : 0;
  return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
}

export function interpretMessage(
  text: string,
  now = new Date(),
  timeZone = DEFAULT_TIMEZONE,
): InterpretResult {
  const t = (text || "").trim().toLowerCase();

  if (/(ajuda|help|menu)/.test(t)) {
    return { intent: "HELP", slots: {}, confidence: 0.95, normalizedText: t };
  }

  if (/(cancelar|cancela|desmarcar)/.test(t)) {
    return {
      intent: "CANCEL_REQUEST",
      slots: {},
      confidence: 0.9,
      normalizedText: t,
    };
  }

  // Scheduling keywords
  if (
    /(agendar|marcar|consulta|hor[aá]rio|horario)/.test(t) ||
    t.includes("amanh") ||
    t.includes("hoje")
  ) {
    const slots: { dateIso?: string; time?: string } = {};

    const today = todayDateIso(timeZone, now);
    if (t.includes("hoje")) slots.dateIso = today;
    if (t.includes("amanh")) slots.dateIso = addDaysIso(today, 1);

    // Horas faladas exigem contexto temporal para não confundir opções, quantidades ou datas.
    const spokenTime = parseSpokenTime(t);
    if (spokenTime) slots.time = spokenTime;
    else {
      // hora: "10", "10:30", "10h", "10h30"
      const hm = t.match(/\b([01]?\d|2[0-3])(?:[:h]([0-5]\d)?)?\b/);
      if (hm) {
        const hh = String(hm[1]).padStart(2, "0");
        const mm = hm[2] ? String(hm[2]).padStart(2, "0") : "00";
        slots.time = `${hh}:${mm}`;
      }
    }

    return {
      intent: "SCHEDULE_REQUEST",
      slots,
      confidence: 0.65,
      normalizedText: t,
    };
  }

  // “10:00” sozinho (continuação de sessão)
  if (/^\s*([01]?\d|2[0-3])(?::([0-5]\d))?\s*$/.test(t)) {
    const hm = t.match(/^\s*([01]?\d|2[0-3])(?::([0-5]\d))?\s*$/)!;
    const hh = String(hm[1]).padStart(2, "0");
    const mm = hm[2] ? String(hm[2]).padStart(2, "0") : "00";
    return {
      intent: "UNKNOWN",
      slots: { time: `${hh}:${mm}` },
      confidence: 0.5,
      normalizedText: t,
    };
  }

  return { intent: "UNKNOWN", slots: {}, confidence: 0.2, normalizedText: t };
}
