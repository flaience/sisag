export type ReadinessSlot = { startTime: string; endTime: string; professionalId: string; professionalName: string };

function localMoment(value: string, timezone: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return { date: part("year") + "-" + part("month") + "-" + part("day"), time: part("hour") + ":" + part("minute") };
}

export function evaluateSpecificTimeAvailability(input: { slots: ReadinessSlot[]; date: string; time: string; timezone: string; professionalId: string }) {
  const normalized = input.slots.map((slot) => ({ slot, moment: localMoment(slot.startTime, input.timezone) })).filter((item) => item.moment?.date === input.date);
  const exact = normalized.filter((item) => item.moment?.time === input.time);
  const selected = exact.find((item) => item.slot.professionalId === input.professionalId)?.slot ?? null;
  const assigned = exact[0]?.slot ?? null;
  const alternatives = normalized.filter((item) => item.slot.professionalId === input.professionalId).slice(0, 8).map((item) => ({ startTime: item.slot.startTime, time: item.moment!.time }));
  return { available: selected !== null, selected, assignedToDifferentProfessional: selected === null && assigned !== null ? { professionalId: assigned.professionalId, professionalName: assigned.professionalName } : null, alternatives };
}
