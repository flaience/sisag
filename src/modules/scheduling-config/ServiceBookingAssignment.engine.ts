import { and, asc, desc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { companyUnits, professionalSchedules, professionalServices, professionalUnits, professionals, schedulingConfig, serviceBookingAssignmentRules, services } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

type ResolutionInput = { companyId: string; unitId: string; serviceId: string; startsAt: Date };
type LocalMoment = { weekday: number; time: string; timezone: string };
type Dependencies = { find?: (input: ResolutionInput, moment: LocalMoment) => Promise<string | null>; timezone?: (companyId: string) => Promise<string> };
const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function toAssignmentLocalMoment(startsAt: Date, timezone: string): LocalMoment {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(startsAt);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { weekday: weekdayMap[value("weekday")] ?? startsAt.getUTCDay(), time: value("hour") + ":" + value("minute"), timezone };
}

async function companyTimezone(companyId: string) { const rows = await getDb().select({ timezone: schedulingConfig.timezone }).from(schedulingConfig).where(eq(schedulingConfig.companyId, companyId)).limit(1); return rows[0]?.timezone ?? "America/Sao_Paulo"; }
async function findDb(input: ResolutionInput, moment: LocalMoment) {
  const rows = await getDb().select({ professionalId: serviceBookingAssignmentRules.professionalId })
    .from(serviceBookingAssignmentRules)
    .innerJoin(companyUnits, and(eq(companyUnits.companyId, input.companyId), eq(companyUnits.id, serviceBookingAssignmentRules.unitId), eq(companyUnits.active, true)))
    .innerJoin(professionals, and(eq(professionals.companyId, input.companyId), eq(professionals.id, serviceBookingAssignmentRules.professionalId), eq(professionals.status, "ACTIVE")))
    .innerJoin(professionalUnits, and(eq(professionalUnits.companyId, input.companyId), eq(professionalUnits.unitId, input.unitId), eq(professionalUnits.professionalId, serviceBookingAssignmentRules.professionalId), eq(professionalUnits.active, true)))
    .innerJoin(professionalServices, and(eq(professionalServices.companyId, input.companyId), eq(professionalServices.professionalId, serviceBookingAssignmentRules.professionalId), eq(professionalServices.serviceId, input.serviceId), eq(professionalServices.active, true)))
    .innerJoin(services, and(eq(services.companyId, input.companyId), eq(services.id, input.serviceId), eq(services.active, true)))
    .innerJoin(professionalSchedules, and(eq(professionalSchedules.companyId, input.companyId), eq(professionalSchedules.unitId, input.unitId), eq(professionalSchedules.professionalId, serviceBookingAssignmentRules.professionalId), eq(professionalSchedules.weekday, moment.weekday), lte(professionalSchedules.startTime, moment.time), gt(professionalSchedules.endTime, moment.time)))
    .where(and(eq(serviceBookingAssignmentRules.companyId, input.companyId), eq(serviceBookingAssignmentRules.unitId, input.unitId), eq(serviceBookingAssignmentRules.weekday, moment.weekday), eq(serviceBookingAssignmentRules.active, true), lte(serviceBookingAssignmentRules.startTime, moment.time), gt(serviceBookingAssignmentRules.endTime, moment.time), or(eq(serviceBookingAssignmentRules.serviceId, input.serviceId), isNull(serviceBookingAssignmentRules.serviceId))))
    .orderBy(desc(sql`${serviceBookingAssignmentRules.serviceId} is not null`), desc(serviceBookingAssignmentRules.priority), asc(serviceBookingAssignmentRules.createdAt)).limit(1);
  return rows[0]?.professionalId ?? null;
}

export async function resolveServiceBookingProfessional(input: ResolutionInput, dependencies: Dependencies = {}) {
  if (!input.companyId || !input.unitId || !input.serviceId || Number.isNaN(input.startsAt.getTime())) return null;
  const timezone = await (dependencies.timezone ?? companyTimezone)(input.companyId);
  const moment = toAssignmentLocalMoment(input.startsAt, timezone);
  return (dependencies.find ?? findDb)(input, moment);
}
