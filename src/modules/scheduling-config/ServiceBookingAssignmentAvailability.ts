export type ProfessionalSchedulePeriod = { unitId: string; weekday: number; startTime: string; endTime: string };
export type AssignmentPeriod = { unitId: string; weekday: number; startTime: string; endTime: string };

export function isAssignmentCoveredByProfessionalSchedule(assignment: AssignmentPeriod, schedules: ProfessionalSchedulePeriod[]) {
  if (!assignment.unitId || assignment.startTime >= assignment.endTime) return false;
  return schedules.some((schedule) => schedule.unitId === assignment.unitId
    && schedule.weekday === assignment.weekday
    && schedule.startTime <= assignment.startTime
    && schedule.endTime >= assignment.endTime);
}
