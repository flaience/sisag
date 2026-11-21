export type ArrivalIntentionDecision =
  | { accepted: true; remaining: number | null }
  | { accepted: false; reason: "period_weekday_mismatch" | "period_capacity_exhausted" };

export function weekdayForAttendanceDate(value: string) {
  return new Date(value + "T12:00:00.000Z").getUTCDay();
}

export function decideArrivalIntention(input: { attendanceDate: string; periodWeekday: number; capacity: number | null; registered: number }): ArrivalIntentionDecision {
  if (weekdayForAttendanceDate(input.attendanceDate) !== input.periodWeekday) return { accepted: false, reason: "period_weekday_mismatch" };
  if (input.capacity === null) return { accepted: true, remaining: null };
  const remaining = Math.max(0, input.capacity - Math.max(0, input.registered));
  return remaining > 0 ? { accepted: true, remaining: remaining - 1 } : { accepted: false, reason: "period_capacity_exhausted" };
}
