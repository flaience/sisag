export type StaffAgendaPeriod = "morning" | "afternoon" | "evening" | "full_day";
export type StaffAgendaDay = "today" | "tomorrow" | "specific" | "this_week" | "next_week" | "this_month" | "next_month" | "specific_month";

export type StaffAgendaQuery =
  | { kind: "next_appointment"; professionalName?: string }
  | { kind: "day_agenda"; period: StaffAgendaPeriod; day?: StaffAgendaDay; dateText?: string; professionalName?: string }
  | { kind: "day_summary"; period: StaffAgendaPeriod; day: StaffAgendaDay; dateText?: string; professionalName?: string };

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9\s-]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

function professionalNameFrom(value: string) {
  const match = value.match(/\b(?:dr|dra|doutor|doutora|profissional)\s+([a-z][a-z' -]{1,80}?)(?=\s+(?:tem|possui|hoje|amanha|depois|esta|essa|nesta|nessa|proxima|proximo|no|na|em|dia|pela|a tarde|de manha|a noite)\b|$)/);
  return match?.[1]?.trim() || undefined;
}

function periodFrom(value: string): StaffAgendaPeriod {
  if (/\b(tarde)\b/.test(value)) return "afternoon";
  if (/\b(manha)\b/.test(value)) return "morning";
  if (/\b(noite)\b/.test(value)) return "evening";
  return "full_day";
}

const MONTH_PATTERN = "janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro";

function hasNamedMonth(value: string) {
  return new RegExp("\\b(?:em|no mes de|mes de)\\s+(?:" + MONTH_PATTERN + ")\\b").test(value);
}

function hasSpecificDate(value: string) {
  return /\b(?:proxim[ao]\s+)?(?:domingo|segunda(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sabado)\b/.test(value)
    || /\bdia\s+(?:[1-9]|[12]\d|3[01]|um|uma|primeiro|dois|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezassete|dezessete|dezoito|dezenove|vinte(?:\s+e\s+(?:um|dois|tres|quatro|cinco|seis|sete|oito|nove))?|trinta(?:\s+e\s+um)?)\b/.test(value);
}

export function interpretStaffAgendaQuery(text: string): StaffAgendaQuery | null {
  const value = normalize(text);
  const professionalName = professionalNameFrom(value);
  const professionalTarget = professionalName ? { professionalName } : {};
  if (/\b(proximo atendimento|proxima consulta|proximo paciente)\b/.test(value)) {
    return { kind: "next_appointment", ...professionalTarget };
  }

  const hasAgendaSubject = /\b(minha agenda|agenda (?:do|da)|meus atendimentos|minhas consultas|atendimentos (?:eu )?tenho|consultas (?:eu )?tenho)\b/.test(value)
    || (/\b(quantos|quantas|total de)\b/.test(value) && /\b(atendimentos?|consultas?)\b/.test(value) && /\b(tem|tenho)\b/.test(value));
  if (!hasAgendaSubject) return null;

  const period = periodFrom(value);
  const nextMonth = /\b(proximo mes|mes que vem)\b/.test(value);
  const thisMonth = !nextMonth && /\b((?:este|esse|neste|nesse) mes|mes atual)\b/.test(value);
  const specificMonth = !nextMonth && !thisMonth && hasNamedMonth(value);
  const nextWeek = !nextMonth && !thisMonth && !specificMonth && /\b(proxima semana|semana que vem)\b/.test(value);
  const thisWeek = !nextWeek && !nextMonth && !thisMonth && !specificMonth && /\b((?:esta|essa|nesta|nessa) semana|semana atual)\b/.test(value);
  const specific = !thisWeek && !nextWeek && !nextMonth && !thisMonth && !specificMonth && !/\b(hoje|amanha)\b/.test(value) && hasSpecificDate(value);
  const day: StaffAgendaDay = nextMonth ? "next_month" : thisMonth ? "this_month" : specificMonth ? "specific_month" : nextWeek ? "next_week" : thisWeek ? "this_week" : specific ? "specific" : /\b(amanha)\b/.test(value) ? "tomorrow" : "today";
  const dateText = specific || specificMonth ? text : undefined;

  if (/\b(quantos|quantas|total de)\b/.test(value)) {
    return { kind: "day_summary", period, day, ...(dateText ? { dateText } : {}), ...professionalTarget };
  }
  if (day !== "today") return { kind: "day_agenda", period, day, ...(dateText ? { dateText } : {}), ...professionalTarget };
  return { kind: "day_agenda", period, ...professionalTarget };
}
