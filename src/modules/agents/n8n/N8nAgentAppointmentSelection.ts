export type TrustedSelectableAppointment = {
  appointmentId: string;
  status: "PENDING" | "CONFIRMED";
  startsAt: string;
  serviceNames: string[];
};

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
const selectableStatuses = new Set(["PENDING", "CONFIRMED"]);

function localParts(value: string, timeZone: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value;
  const day = part("day"), month = part("month"), year = part("year"), hour = part("hour"), minute = part("minute");
  return day && month && year && hour && minute ? { day, month, year, time: hour + ":" + minute } : null;
}

function trustedAppointments(values: TrustedSelectableAppointment[], timeZone: string) {
  const bounded = values.slice(0, 5);
  const identities = bounded.map(value => value.appointmentId.trim()).filter(Boolean);
  if (new Set(identities).size !== identities.length) return [];
  const seen = new Set<string>();
  return bounded.filter(value => {
    if (!value.appointmentId.trim() || seen.has(value.appointmentId) || !selectableStatuses.has(value.status)) return false;
    if (!localParts(value.startsAt, timeZone)) return false;
    seen.add(value.appointmentId);
    return true;
  }).sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}

export function isExplicitN8nAgentAppointmentSelection(text: string) {
  const value = normalize(text);
  return /(?:^|\s)(?:primeir[oa]|segund[oa]|terceir[oa]|quart[oa]|quint[oa]|ultim[oa])(?:$|\s|[.,!?])/.test(value)
    || /(?:^|\s)(?:0?[1-9]|[12]\d|3[01])\/(?:0?[1-9]|1[0-2])(?:\/\d{4})?(?=$|\s|[.,!?])/.test(value);
}

export function selectTrustedN8nAgentAppointment(input: { text: string; timeZone: string; appointments: TrustedSelectableAppointment[] }) {
  const appointments = trustedAppointments(input.appointments, input.timeZone);
  if (appointments.length === 0 || !isExplicitN8nAgentAppointmentSelection(input.text)) return null;
  const text = normalize(input.text);
  const ordinals = [["primeiro", "primeira"], ["segundo", "segunda"], ["terceiro", "terceira"], ["quarto", "quarta"], ["quinto", "quinta"]] as const;
  const indexes = ordinals.flatMap((words, index) => words.some(word => new RegExp("(?:^|\\s)" + word + "(?:$|\\s|[.,!?])").test(text)) ? [index] : []);
  if (/(?:^|\s)ultim[oa](?:$|\s|[.,!?])/.test(text)) indexes.push(appointments.length - 1);
  const uniqueIndexes = [...new Set(indexes)];
  if (uniqueIndexes.length === 1) return appointments[uniqueIndexes[0]!] ?? null;
  if (uniqueIndexes.length > 1) return null;

  const dateMatches = [...text.matchAll(/(?:^|\s)(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|1[0-2])(?:\/(\d{4}))?(?=$|\s|[.,!?])/g)];
  if (dateMatches.length !== 1) return null;
  const [, rawDay, rawMonth, rawYear] = dateMatches[0]!;
  const day = rawDay!.padStart(2, "0"), month = rawMonth!.padStart(2, "0");
  const timeMatches = [...text.matchAll(/(?:^|\s)([01]?\d|2[0-3])(?::([0-5]\d)|h(?:([0-5]\d))?)(?=$|\s|[.,!?])/g)];
  const requestedTimes = [...new Set(timeMatches.map(match => match[1]!.padStart(2, "0") + ":" + (match[2] ?? match[3] ?? "00")))];
  if (requestedTimes.length > 1) return null;
  const matches = appointments.filter(appointment => {
    const parts = localParts(appointment.startsAt, input.timeZone)!;
    return parts.day === day && parts.month === month && (!rawYear || parts.year === rawYear) && (requestedTimes.length === 0 || parts.time === requestedTimes[0]);
  });
  return matches.length === 1 ? matches[0]! : null;
}
