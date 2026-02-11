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
  now = new Date(),
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

  if (/(agendar|marcar|consulta|hor[aá]rio|horario)/.test(t)) {
    const slots: any = {};
    if (t.includes("amanh")) slots.dateIso = toDateIso(addDays(now, 1));
    if (t.includes("hoje")) slots.dateIso = toDateIso(now);

    const hm = t.match(/\b([01]?\d|2[0-3])[:h]?([0-5]\d)?\b/);
    if (hm) {
      const hh = String(hm[1]).padStart(2, "0");
      const mm = hm[2] ? String(hm[2]).padStart(2, "0") : "00";
      slots.time = `${hh}:${mm}`;
    }

    return {
      intent: "SCHEDULE_REQUEST",
      slots,
      confidence: 0.6,
      normalizedText: t,
    };
  }

  return { intent: "UNKNOWN", slots: {}, confidence: 0.2, normalizedText: t };
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function toDateIso(d: Date) {
  return d.toISOString().slice(0, 10);
}
