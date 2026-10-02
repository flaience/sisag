export type StaffAgendaPeriod = "morning" | "afternoon" | "evening" | "full_day";
export type StaffAgendaDay = "today" | "tomorrow";

export type StaffAgendaQuery =
  | { kind: "next_appointment" }
  | { kind: "day_agenda"; period: StaffAgendaPeriod; day?: StaffAgendaDay }
  | { kind: "day_summary"; period: StaffAgendaPeriod; day: StaffAgendaDay };

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

function periodFrom(value: string): StaffAgendaPeriod {
  if (/\b(tarde)\b/.test(value)) return "afternoon";
  if (/\b(manha)\b/.test(value)) return "morning";
  if (/\b(noite)\b/.test(value)) return "evening";
  return "full_day";
}

export function interpretStaffAgendaQuery(text: string): StaffAgendaQuery | null {
  const value = normalize(text);
  if (/\b(proximo atendimento|proxima consulta|proximo paciente)\b/.test(value)) {
    return { kind: "next_appointment" };
  }

  const hasAgendaSubject = /\b(minha agenda|meus atendimentos|minhas consultas|atendimentos tenho|consultas tenho)\b/.test(value);
  if (!hasAgendaSubject) return null;

  const period = periodFrom(value);
  const day: StaffAgendaDay = /\b(amanha)\b/.test(value) ? "tomorrow" : "today";
  if (/\b(quantos|quantas|total de)\b/.test(value)) {
    return { kind: "day_summary", period, day };
  }
  if (day === "tomorrow") return { kind: "day_agenda", period, day };
  return { kind: "day_agenda", period };
}
