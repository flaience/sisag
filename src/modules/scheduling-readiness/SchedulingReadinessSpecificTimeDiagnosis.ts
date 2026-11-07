export type SpecificTimeSchedule = { unitId: string; weekday: number; startTime: string; endTime: string };
export type SpecificTimeAssignment = { unitId: string; serviceId: string | null; professionalId: string; weekday: number; startTime: string; endTime: string; active: boolean };
export type SpecificTimeSlot = { startTime: string; endTime: string; professionalId: string; professionalName: string };
export type SpecificTimeDiagnosisReason = "available" | "outside_professional_schedule" | "outside_assignment" | "assigned_to_other_professional" | "unavailable_after_configuration";

const minutes = (value: string) => { const match = /^(\d{2}):(\d{2})$/.exec(value); if (!match) return null; const result = Number(match[1]) * 60 + Number(match[2]); return result >= 0 && result < 1440 ? result : null; };
const weekday = (date: string) => { const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date); if (!match) return null; const parsed = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))); return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? parsed.getUTCDay() : null; };
function localMoment(value: string, timezone: string) { const parsed = new Date(value); if (!Number.isFinite(parsed.getTime())) return null; const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(parsed); const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ""; return { date: part("year") + "-" + part("month") + "-" + part("day"), time: part("hour") + ":" + part("minute") }; }

export function diagnoseSchedulingSpecificTime(input: { unitId: string; serviceId: string; professionalId: string; date: string; time: string; durationMinutes: number; timezone: string; schedules: SpecificTimeSchedule[]; assignments: SpecificTimeAssignment[]; slots: SpecificTimeSlot[]; alternativeLimit?: number }) {
  const start = minutes(input.time), day = weekday(input.date);
  if (start === null || day === null || !Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0) throw new Error("invalid_specific_time_diagnosis");
  const end = start + input.durationMinutes;
  const normalized = input.slots.map((slot) => ({ slot, moment: localMoment(slot.startTime, input.timezone) })).filter((item) => item.moment?.date === input.date);
  const exact = normalized.filter((item) => item.moment?.time === input.time);
  const selected = exact.find((item) => item.slot.professionalId === input.professionalId)?.slot ?? null;
  const assigned = exact[0]?.slot ?? null;
  const scheduleCovered = input.schedules.some((item) => item.unitId === input.unitId && item.weekday === day && (minutes(item.startTime) ?? 1440) <= start && (minutes(item.endTime) ?? -1) >= end);
  const assignmentCovered = input.assignments.some((item) => item.active && item.unitId === input.unitId && item.professionalId === input.professionalId && (item.serviceId === null || item.serviceId === input.serviceId) && item.weekday === day && (minutes(item.startTime) ?? 1440) <= start && (minutes(item.endTime) ?? -1) >= end);
  const reason: SpecificTimeDiagnosisReason = selected ? "available" : assigned ? "assigned_to_other_professional" : !scheduleCovered ? "outside_professional_schedule" : !assignmentCovered ? "outside_assignment" : "unavailable_after_configuration";
  const alternatives = normalized.filter((item) => item.slot.professionalId === input.professionalId && item.moment !== null).map((item) => ({ startTime: item.slot.startTime, time: item.moment!.time, distanceMinutes: Math.abs((minutes(item.moment!.time) ?? start) - start) })).sort((left, right) => left.distanceMinutes - right.distanceMinutes || left.time.localeCompare(right.time)).slice(0, input.alternativeLimit ?? 8).map(({ distanceMinutes: _distance, ...item }) => item);
  return { available: selected !== null, reason, selected, assignedProfessional: reason === "assigned_to_other_professional" && assigned ? { professionalId: assigned.professionalId, professionalName: assigned.professionalName } : null, alternatives, evidence: { scheduleCovered, assignmentCovered, exactSlotExists: assigned !== null }, readOnly: true as const };
}
