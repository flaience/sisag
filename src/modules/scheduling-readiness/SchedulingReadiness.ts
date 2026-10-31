import { isAssignmentCoveredByProfessionalSchedule, type ProfessionalSchedulePeriod } from "@/modules/scheduling-config/ServiceBookingAssignmentAvailability";

export type SchedulingReadinessInput = {
  unitActive: boolean;
  serviceActive: boolean;
  serviceDurationMinutes: number | null;
  professionalActive: boolean;
  professionalUnitActive: boolean;
  professionalServiceActive: boolean;
  schedules: ProfessionalSchedulePeriod[];
  assignments: Array<{ unitId: string; weekday: number; startTime: string; endTime: string; active: boolean }>;
  activeBlockingExceptions: number;
};

export type SchedulingReadinessCheckKey = "unit" | "service" | "service_duration" | "professional" | "professional_unit" | "professional_service" | "professional_schedule" | "assignment_coverage";
export type SchedulingReadinessCheck = { key: SchedulingReadinessCheckKey; status: "ready" | "missing" };

export function evaluateSchedulingReadiness(input: SchedulingReadinessInput) {
  const hasSchedule = input.schedules.length > 0;
  const hasCoveredAssignment = input.assignments
    .filter((assignment) => assignment.active)
    .some((assignment) => isAssignmentCoveredByProfessionalSchedule(assignment, input.schedules));
  const checks: SchedulingReadinessCheck[] = [
    { key: "unit", status: input.unitActive ? "ready" : "missing" },
    { key: "service", status: input.serviceActive ? "ready" : "missing" },
    { key: "service_duration", status: input.serviceDurationMinutes !== null && Number.isInteger(input.serviceDurationMinutes) && input.serviceDurationMinutes > 0 ? "ready" : "missing" },
    { key: "professional", status: input.professionalActive ? "ready" : "missing" },
    { key: "professional_unit", status: input.professionalUnitActive ? "ready" : "missing" },
    { key: "professional_service", status: input.professionalServiceActive ? "ready" : "missing" },
    { key: "professional_schedule", status: hasSchedule ? "ready" : "missing" },
    { key: "assignment_coverage", status: hasCoveredAssignment ? "ready" : "missing" },
  ];
  return {
    ready: checks.every((check) => check.status === "ready"),
    checks,
    warnings: input.activeBlockingExceptions > 0 ? [{ code: "active_availability_exceptions", count: input.activeBlockingExceptions }] : [],
    readOnly: true as const,
  };
}
