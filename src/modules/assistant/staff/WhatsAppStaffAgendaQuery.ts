export type StaffAgendaPeriod = "morning" | "afternoon" | "evening" | "full_day";
export type StaffAgendaDay = "today" | "tomorrow" | "specific";

export type StaffAgendaQuery =
  | { kind: "next_appointment" }
  | { kind: "day_agenda"; period: StaffAgendaPeriod; day?: StaffAgendaDay; dateText?: string }
  | { kind: "day_summary"; period: StaffAgendaPeriod; day: StaffAgendaDay; dateText?: string };

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9\s-]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

function periodFrom(value: string): StaffAgendaPeriod {
  if (/\b(tarde)\b/.test(value)) return "afternoon";
  if (/\b(manha)\b/.test(value)) return "morning";
  if (/\b(noite)\b/.test(value)) return "evening";
  return "full_day";
}

function hasSpecificDate(value: string) {
  return /\b(?:proxim[ao]\s+)?(?:domingo|segunda(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sabado)\b/.test(value)
    || /\bdia\s+(?:[1-9]|[12]\d|3[01]|um|uma|primeiro|dois|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezassete|dezessete|dezoito|dezenove|vinte(?:\s+e\s+(?:um|dois|tres|quatro|cinco|seis|sete|oito|nove))?|trinta(?:\s+e\s+um)?)\b/.test(value);
}

export function interpretStaffAgendaQuery(text: string): StaffAgendaQuery | null {
  const value = normalize(text);
  if (/\b(proximo atendimento|proxima consulta|proximo paciente)\b/.test(value)) {
    return { kind: "next_appointment" };
  }

  const hasAgendaSubject = /\b(minha agenda|meus atendimentos|minhas consultas|atendimentos tenho|consultas tenho)\b/.test(value);
  if (!hasAgendaSubject) return null;

  const period = periodFrom(value);
  const specific = !/\b(hoje|amanha)\b/.test(value) && hasSpecificDate(value);
  const day: StaffAgendaDay = specific ? "specific" : /\b(amanha)\b/.test(value) ? "tomorrow" : "today";
  const dateText = specific ? text : undefined;

  if (/\b(quantos|quantas|total de)\b/.test(value)) {
    return { kind: "day_summary", period, day, ...(dateText ? { dateText } : {}) };
  }
  if (day !== "today") return { kind: "day_agenda", period, day, ...(dateText ? { dateText } : {}) };
  return { kind: "day_agenda", period };
}
