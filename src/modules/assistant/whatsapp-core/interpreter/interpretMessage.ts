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

export function interpretMessage(
  text: string,
  _now = new Date(),
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

    const today = todayDateIso(DEFAULT_TIMEZONE);
    if (t.includes("hoje")) slots.dateIso = today;
    if (t.includes("amanh")) slots.dateIso = addDaysIso(today, 1);

    // hora: "10", "10:30", "10h", "10h30"
    const hm = t.match(/\b([01]?\d|2[0-3])(?:[:h]([0-5]\d))?\b/);
    if (hm) {
      const hh = String(hm[1]).padStart(2, "0");
      const mm = hm[2] ? String(hm[2]).padStart(2, "0") : "00";
      slots.time = `${hh}:${mm}`;
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
