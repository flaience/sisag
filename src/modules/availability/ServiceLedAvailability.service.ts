import { and, asc, desc, eq, isNull, or } from "drizzle-orm";
import { professionalServices, professionalUnits, professionals, schedulingConfig, serviceBookingAssignmentRules, services } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { zonedDateTimeToUtcISOString } from "@/lib/time";
import { toAssignmentLocalMoment } from "@/modules/scheduling-config/ServiceBookingAssignment.engine";
import { AvailabilityService } from "./Availability.service";

type Candidate = { professionalId: string; professionalName: string; resourceId: string; startTime: string; endTime: string; resourceIds: string[] };
type Rule = { professionalId: string; serviceId: string | null; startTime: string; endTime: string; priority: number; createdAt: Date };
export type ServiceLedSlot = Candidate & { assignment: "specific" | "shift" | "available" };

export function consolidateServiceLedSlots(candidates: Candidate[], rules: Rule[], timezone: string): ServiceLedSlot[] {
  const grouped = new Map<string, Candidate[]>();
  for (const candidate of candidates) grouped.set(candidate.startTime, [...(grouped.get(candidate.startTime) ?? []), candidate]);
  return [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, options]) => {
    const moment = toAssignmentLocalMoment(new Date(options[0].startTime), timezone);
    const matching = rules.filter((rule) => rule.startTime <= moment.time && rule.endTime > moment.time && options.some((option) => option.professionalId === rule.professionalId)).sort((left, right) => Number(Boolean(right.serviceId)) - Number(Boolean(left.serviceId)) || right.priority - left.priority || left.createdAt.getTime() - right.createdAt.getTime());
    const preferred = matching[0];
    const selected = preferred ? options.find((option) => option.professionalId === preferred.professionalId)! : [...options].sort((left, right) => left.professionalName.localeCompare(right.professionalName) || left.professionalId.localeCompare(right.professionalId))[0];
    return { ...selected, assignment: preferred ? (preferred.serviceId ? "specific" : "shift") : "available" };
  });
}

export class ServiceLedAvailabilityError extends Error { constructor(public readonly code: "unit_required" | "service_required" | "invalid_date" | "service_not_found" | "no_eligible_professionals") { super(code); } }

export async function listServiceLedAvailability(input: { companyId: string; unitId: string; serviceId: string; date: string; limit?: number; stepMinutes?: number }) {
  if (!input.unitId) throw new ServiceLedAvailabilityError("unit_required"); if (!input.serviceId) throw new ServiceLedAvailabilityError("service_required"); if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new ServiceLedAvailabilityError("invalid_date");
  const db = getDb();
  const config = await db.select({ timezone: schedulingConfig.timezone }).from(schedulingConfig).where(eq(schedulingConfig.companyId, input.companyId)).limit(1); const timezone = config[0]?.timezone ?? "America/Sao_Paulo";
  const service = await db.select({ id: services.id, durationMinutes: services.durationMinutes }).from(services).where(and(eq(services.companyId, input.companyId), eq(services.id, input.serviceId), eq(services.active, true))).limit(1); if (!service[0]) throw new ServiceLedAvailabilityError("service_not_found");
  const people = await db.select({ professionalId: professionals.id, professionalName: professionals.name, resourceId: professionals.resourceId }).from(professionals)
    .innerJoin(professionalUnits, and(eq(professionalUnits.companyId, input.companyId), eq(professionalUnits.professionalId, professionals.id), eq(professionalUnits.unitId, input.unitId), eq(professionalUnits.active, true)))
    .innerJoin(professionalServices, and(eq(professionalServices.companyId, input.companyId), eq(professionalServices.professionalId, professionals.id), eq(professionalServices.serviceId, input.serviceId), eq(professionalServices.active, true)))
    .where(and(eq(professionals.companyId, input.companyId), eq(professionals.status, "ACTIVE")));
  const eligible = people.filter((item): item is { professionalId: string; professionalName: string; resourceId: string } => Boolean(item.resourceId)); if (!eligible.length) throw new ServiceLedAvailabilityError("no_eligible_professionals");
  const startTime = new Date(zonedDateTimeToUtcISOString(input.date, "00:00", timezone)); const weekday = toAssignmentLocalMoment(startTime, timezone).weekday;
  const rules = await db.select({ professionalId: serviceBookingAssignmentRules.professionalId, serviceId: serviceBookingAssignmentRules.serviceId, startTime: serviceBookingAssignmentRules.startTime, endTime: serviceBookingAssignmentRules.endTime, priority: serviceBookingAssignmentRules.priority, createdAt: serviceBookingAssignmentRules.createdAt }).from(serviceBookingAssignmentRules).where(and(eq(serviceBookingAssignmentRules.companyId, input.companyId), eq(serviceBookingAssignmentRules.unitId, input.unitId), eq(serviceBookingAssignmentRules.weekday, weekday), eq(serviceBookingAssignmentRules.active, true), or(eq(serviceBookingAssignmentRules.serviceId, input.serviceId), isNull(serviceBookingAssignmentRules.serviceId)))).orderBy(desc(serviceBookingAssignmentRules.priority), asc(serviceBookingAssignmentRules.createdAt));
  const results = await Promise.all(eligible.map(async (professional) => ({ professional, result: await AvailabilityService.listSlots({ companyId: input.companyId, unitId: input.unitId, serviceId: input.serviceId, professionalId: professional.professionalId, resourceId: professional.resourceId, startTime, durationMinutes: service[0].durationMinutes, limit: input.limit ?? 200, stepMinutes: input.stepMinutes ?? 15 }) })));
  const candidates: Candidate[] = results.flatMap(({ professional, result }) => result.ok ? result.slots.map((slot) => ({ ...slot, professionalId: professional.professionalId, professionalName: professional.professionalName, resourceId: professional.resourceId })) : []);
  return { date: input.date, timezone, unitId: input.unitId, serviceId: input.serviceId, slots: consolidateServiceLedSlots(candidates, rules, timezone) };
}
