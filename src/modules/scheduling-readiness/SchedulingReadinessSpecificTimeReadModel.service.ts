import { and, eq, isNull, or } from "drizzle-orm";
import { professionalSchedules, professionalServices, serviceBookingAssignmentRules, services } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { listServiceLedAvailability } from "@/modules/availability/ServiceLedAvailability.service";
import { diagnoseSchedulingSpecificTime, type SpecificTimeAssignment, type SpecificTimeSchedule, type SpecificTimeSlot } from "./SchedulingReadinessSpecificTimeDiagnosis";

export type SchedulingReadinessSpecificTimeInput = { companyId: string; unitId: string; serviceId: string; professionalId: string; date: string; time: string };
type Facts = { durationMinutes: number | null; timezone: string; schedules: SpecificTimeSchedule[]; assignments: SpecificTimeAssignment[]; slots: SpecificTimeSlot[] };
type Dependencies = { loadFacts: (input: SchedulingReadinessSpecificTimeInput) => Promise<Facts> };

async function loadFacts(input: SchedulingReadinessSpecificTimeInput): Promise<Facts> {
  const db = getDb();
  const [serviceRows, overrideRows, schedules, assignments, availability] = await Promise.all([
    db.select({ durationMinutes: services.durationMinutes }).from(services).where(and(eq(services.companyId, input.companyId), eq(services.id, input.serviceId), eq(services.active, true))).limit(1),
    db.select({ durationOverrideMinutes: professionalServices.durationOverrideMinutes }).from(professionalServices).where(and(eq(professionalServices.companyId, input.companyId), eq(professionalServices.professionalId, input.professionalId), eq(professionalServices.serviceId, input.serviceId), eq(professionalServices.active, true))).limit(1),
    db.select({ unitId: professionalSchedules.unitId, weekday: professionalSchedules.weekday, startTime: professionalSchedules.startTime, endTime: professionalSchedules.endTime }).from(professionalSchedules).where(and(eq(professionalSchedules.companyId, input.companyId), eq(professionalSchedules.unitId, input.unitId), eq(professionalSchedules.professionalId, input.professionalId))),
    db.select({ unitId: serviceBookingAssignmentRules.unitId, serviceId: serviceBookingAssignmentRules.serviceId, professionalId: serviceBookingAssignmentRules.professionalId, weekday: serviceBookingAssignmentRules.weekday, startTime: serviceBookingAssignmentRules.startTime, endTime: serviceBookingAssignmentRules.endTime, active: serviceBookingAssignmentRules.active }).from(serviceBookingAssignmentRules).where(and(eq(serviceBookingAssignmentRules.companyId, input.companyId), eq(serviceBookingAssignmentRules.unitId, input.unitId), eq(serviceBookingAssignmentRules.professionalId, input.professionalId), eq(serviceBookingAssignmentRules.active, true), or(eq(serviceBookingAssignmentRules.serviceId, input.serviceId), isNull(serviceBookingAssignmentRules.serviceId)))),
    listServiceLedAvailability({ companyId: input.companyId, unitId: input.unitId, serviceId: input.serviceId, date: input.date, limit: 200, stepMinutes: 15 }),
  ]);
  return { durationMinutes: overrideRows[0]?.durationOverrideMinutes ?? serviceRows[0]?.durationMinutes ?? null, timezone: availability.timezone, schedules, assignments, slots: availability.slots };
}

const defaults: Dependencies = { loadFacts };
export async function getSchedulingReadinessSpecificTime(input: SchedulingReadinessSpecificTimeInput, supplied: Partial<Dependencies> = {}) {
  if (![input.companyId, input.unitId, input.serviceId, input.professionalId, input.date, input.time].every((value) => value.trim())) throw new Error("missing_specific_time_boundary");
  const facts = await { ...defaults, ...supplied }.loadFacts(input);
  if (!facts.durationMinutes) throw new Error("missing_service_duration");
  return diagnoseSchedulingSpecificTime({ ...input, durationMinutes: facts.durationMinutes, timezone: facts.timezone, schedules: facts.schedules, assignments: facts.assignments, slots: facts.slots });
}
