export type StaffAgendaQuery =
  | { kind: "next_appointment" }
  | { kind: "day_agenda"; period: "morning" | "afternoon" | "evening" | "full_day" };

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

export function interpretStaffAgendaQuery(text: string): StaffAgendaQuery | null {
  const value = normalize(text);
  if (/\b(proximo atendimento|proxima consulta|proximo paciente)\b/.test(value)) {
    return { kind: "next_appointment" };
  }
  if (!/\b(minha agenda|meus atendimentos|minhas consultas)\b/.test(value)) return null;
  if (/\b(tarde)\b/.test(value)) return { kind: "day_agenda", period: "afternoon" };
  if (/\b(manha)\b/.test(value)) return { kind: "day_agenda", period: "morning" };
  if (/\b(noite)\b/.test(value)) return { kind: "day_agenda", period: "evening" };
  return { kind: "day_agenda", period: "full_day" };
}
