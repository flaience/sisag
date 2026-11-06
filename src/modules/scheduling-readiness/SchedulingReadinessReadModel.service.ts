import { and, eq, isNull, or } from "drizzle-orm";
import { availabilityExceptions, companyUnits, professionalSchedules, professionalServices, professionalUnits, professionals, serviceBookingAssignmentRules, services } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { evaluateSchedulingReadiness } from "./SchedulingReadiness";

export type SchedulingReadinessReadModelInput = { companyId: string; unitId: string; serviceId: string; professionalId: string };
type Facts = {
  unit: { active: boolean } | null;
  service: { active: boolean; durationMinutes: number } | null;
  professional: { status: string | null } | null;
  professionalUnit: { active: boolean } | null;
  professionalService: { active: boolean; durationOverrideMinutes: number | null } | null;
  schedules: Array<{ unitId: string; weekday: number; startTime: string; endTime: string }>;
  assignments: Array<{ unitId: string; weekday: number; startTime: string; endTime: string; active: boolean }>;
  activeBlockingExceptions: number;
};
type Dependencies = { loadFacts: (input: SchedulingReadinessReadModelInput) => Promise<Facts> };

function first<T>(rows: T[]) { return rows[0] ?? null; }

async function loadFacts(input: SchedulingReadinessReadModelInput): Promise<Facts> {
  const db = getDb();
  const [unitRows, serviceRows, professionalRows, unitLinkRows, serviceLinkRows, schedules, assignments, exceptions] = await Promise.all([
    db.select({ active: companyUnits.active }).from(companyUnits).where(and(eq(companyUnits.companyId, input.companyId), eq(companyUnits.id, input.unitId))).limit(1),
    db.select({ active: services.active, durationMinutes: services.durationMinutes }).from(services).where(and(eq(services.companyId, input.companyId), eq(services.id, input.serviceId))).limit(1),
    db.select({ status: professionals.status }).from(professionals).where(and(eq(professionals.companyId, input.companyId), eq(professionals.id, input.professionalId))).limit(1),
    db.select({ active: professionalUnits.active }).from(professionalUnits).where(and(eq(professionalUnits.companyId, input.companyId), eq(professionalUnits.unitId, input.unitId), eq(professionalUnits.professionalId, input.professionalId))).limit(1),
    db.select({ active: professionalServices.active, durationOverrideMinutes: professionalServices.durationOverrideMinutes }).from(professionalServices).where(and(eq(professionalServices.companyId, input.companyId), eq(professionalServices.serviceId, input.serviceId), eq(professionalServices.professionalId, input.professionalId))).limit(1),
    db.select({ unitId: professionalSchedules.unitId, weekday: professionalSchedules.weekday, startTime: professionalSchedules.startTime, endTime: professionalSchedules.endTime }).from(professionalSchedules).where(and(eq(professionalSchedules.companyId, input.companyId), eq(professionalSchedules.unitId, input.unitId), eq(professionalSchedules.professionalId, input.professionalId))),
    db.select({ unitId: serviceBookingAssignmentRules.unitId, weekday: serviceBookingAssignmentRules.weekday, startTime: serviceBookingAssignmentRules.startTime, endTime: serviceBookingAssignmentRules.endTime, active: serviceBookingAssignmentRules.active }).from(serviceBookingAssignmentRules).where(and(eq(serviceBookingAssignmentRules.companyId, input.companyId), eq(serviceBookingAssignmentRules.unitId, input.unitId), eq(serviceBookingAssignmentRules.professionalId, input.professionalId), eq(serviceBookingAssignmentRules.active, true), or(eq(serviceBookingAssignmentRules.serviceId, input.serviceId), isNull(serviceBookingAssignmentRules.serviceId)))),
    db.select({ id: availabilityExceptions.id }).from(availabilityExceptions).where(and(eq(availabilityExceptions.companyId, input.companyId), eq(availabilityExceptions.status, "active"), or(eq(availabilityExceptions.unitId, input.unitId), eq(availabilityExceptions.professionalId, input.professionalId), and(isNull(availabilityExceptions.unitId), isNull(availabilityExceptions.professionalId))))),
  ]);
  return { unit: first(unitRows), service: first(serviceRows), professional: first(professionalRows), professionalUnit: first(unitLinkRows), professionalService: first(serviceLinkRows), schedules, assignments, activeBlockingExceptions: exceptions.length };
}

const defaults: Dependencies = { loadFacts };

export async function getSchedulingReadiness(input: SchedulingReadinessReadModelInput, supplied: Partial<Dependencies> = {}) {
  if (!input.companyId.trim() || !input.unitId.trim() || !input.serviceId.trim() || !input.professionalId.trim()) throw new Error("missing_readiness_boundary");
  const facts = await { ...defaults, ...supplied }.loadFacts(input);
  const duration = facts.professionalService?.durationOverrideMinutes ?? facts.service?.durationMinutes ?? null;
  return evaluateSchedulingReadiness({
    unitActive: facts.unit?.active === true,
    serviceActive: facts.service?.active === true,
    serviceDurationMinutes: duration,
    professionalActive: facts.professional?.status?.toUpperCase() === "ACTIVE",
    professionalUnitActive: facts.professionalUnit?.active === true,
    professionalServiceActive: facts.professionalService?.active === true,
    schedules: facts.schedules,
    assignments: facts.assignments,
    activeBlockingExceptions: facts.activeBlockingExceptions,
  });
}
