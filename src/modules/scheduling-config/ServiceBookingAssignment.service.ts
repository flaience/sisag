import { and, asc, desc, eq } from "drizzle-orm";
import { companyUnits, professionalServices, professionalUnits, professionals, serviceBookingAssignmentRules, services } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import type { ServiceBookingAssignmentFilter, ServiceBookingAssignmentInput } from "./ServiceBookingAssignment.schema";

export class ServiceBookingAssignmentError extends Error {
  constructor(public readonly code: "assignment_not_found" | "unit_not_found" | "professional_not_available_at_unit" | "service_not_found" | "professional_not_enabled_for_service") { super(code); }
}

type Dependencies = {
  list?: (companyId: string, filter: ServiceBookingAssignmentFilter) => Promise<unknown[]>;
  create?: (companyId: string, input: ServiceBookingAssignmentInput) => Promise<unknown>;
  update?: (companyId: string, id: string, input: ServiceBookingAssignmentInput) => Promise<unknown>;
  deactivate?: (companyId: string, id: string) => Promise<unknown>;
};

const selection = {
  id: serviceBookingAssignmentRules.id,
  unitId: serviceBookingAssignmentRules.unitId,
  unitName: companyUnits.name,
  serviceId: serviceBookingAssignmentRules.serviceId,
  serviceName: services.name,
  professionalId: serviceBookingAssignmentRules.professionalId,
  professionalName: professionals.name,
  weekday: serviceBookingAssignmentRules.weekday,
  startTime: serviceBookingAssignmentRules.startTime,
  endTime: serviceBookingAssignmentRules.endTime,
  priority: serviceBookingAssignmentRules.priority,
  active: serviceBookingAssignmentRules.active,
  createdAt: serviceBookingAssignmentRules.createdAt,
  updatedAt: serviceBookingAssignmentRules.updatedAt,
};

async function validateReferences(companyId: string, input: ServiceBookingAssignmentInput) {
  const db = getDb();
  const unit = await db.select({ id: companyUnits.id }).from(companyUnits).where(and(eq(companyUnits.companyId, companyId), eq(companyUnits.id, input.unitId), eq(companyUnits.active, true))).limit(1);
  if (!unit[0]) throw new ServiceBookingAssignmentError("unit_not_found");
  const professionalUnit = await db.select({ id: professionalUnits.id }).from(professionalUnits).innerJoin(professionals, and(eq(professionals.companyId, companyId), eq(professionals.id, professionalUnits.professionalId))).where(and(eq(professionalUnits.companyId, companyId), eq(professionalUnits.unitId, input.unitId), eq(professionalUnits.professionalId, input.professionalId), eq(professionalUnits.active, true), eq(professionals.status, "ACTIVE"))).limit(1);
  if (!professionalUnit[0]) throw new ServiceBookingAssignmentError("professional_not_available_at_unit");
  if (input.serviceId) {
    const service = await db.select({ id: services.id }).from(services).where(and(eq(services.companyId, companyId), eq(services.id, input.serviceId), eq(services.active, true))).limit(1);
    if (!service[0]) throw new ServiceBookingAssignmentError("service_not_found");
    const enabled = await db.select({ id: professionalServices.id }).from(professionalServices).where(and(eq(professionalServices.companyId, companyId), eq(professionalServices.professionalId, input.professionalId), eq(professionalServices.serviceId, input.serviceId), eq(professionalServices.active, true))).limit(1);
    if (!enabled[0]) throw new ServiceBookingAssignmentError("professional_not_enabled_for_service");
  }
}

async function listDb(companyId: string, filter: ServiceBookingAssignmentFilter) {
  const conditions = [eq(serviceBookingAssignmentRules.companyId, companyId)];
  if (filter.status === "active") conditions.push(eq(serviceBookingAssignmentRules.active, true));
  if (filter.status === "inactive") conditions.push(eq(serviceBookingAssignmentRules.active, false));
  if (filter.unitId) conditions.push(eq(serviceBookingAssignmentRules.unitId, filter.unitId));
  if (filter.serviceId) conditions.push(eq(serviceBookingAssignmentRules.serviceId, filter.serviceId));
  if (filter.professionalId) conditions.push(eq(serviceBookingAssignmentRules.professionalId, filter.professionalId));
  return getDb().select(selection).from(serviceBookingAssignmentRules)
    .innerJoin(companyUnits, and(eq(companyUnits.companyId, companyId), eq(companyUnits.id, serviceBookingAssignmentRules.unitId)))
    .innerJoin(professionals, and(eq(professionals.companyId, companyId), eq(professionals.id, serviceBookingAssignmentRules.professionalId)))
    .leftJoin(services, and(eq(services.companyId, companyId), eq(services.id, serviceBookingAssignmentRules.serviceId)))
    .where(and(...conditions)).orderBy(asc(serviceBookingAssignmentRules.weekday), asc(serviceBookingAssignmentRules.startTime), desc(serviceBookingAssignmentRules.priority));
}

async function createDb(companyId: string, input: ServiceBookingAssignmentInput) {
  await validateReferences(companyId, input);
  const rows = await getDb().insert(serviceBookingAssignmentRules).values({ ...input, companyId, serviceId: input.serviceId ?? null }).returning();
  return rows[0];
}

async function updateDb(companyId: string, id: string, input: ServiceBookingAssignmentInput) {
  const current = await getDb().select({ id: serviceBookingAssignmentRules.id }).from(serviceBookingAssignmentRules).where(and(eq(serviceBookingAssignmentRules.companyId, companyId), eq(serviceBookingAssignmentRules.id, id))).limit(1);
  if (!current[0]) throw new ServiceBookingAssignmentError("assignment_not_found");
  await validateReferences(companyId, input);
  const rows = await getDb().update(serviceBookingAssignmentRules).set({ ...input, serviceId: input.serviceId ?? null, updatedAt: new Date() }).where(and(eq(serviceBookingAssignmentRules.companyId, companyId), eq(serviceBookingAssignmentRules.id, id))).returning();
  return rows[0];
}

async function deactivateDb(companyId: string, id: string) {
  const rows = await getDb().update(serviceBookingAssignmentRules).set({ active: false, updatedAt: new Date() }).where(and(eq(serviceBookingAssignmentRules.companyId, companyId), eq(serviceBookingAssignmentRules.id, id), eq(serviceBookingAssignmentRules.active, true))).returning();
  if (!rows[0]) throw new ServiceBookingAssignmentError("assignment_not_found");
  return rows[0];
}

function requireCompany(companyId: string) { if (!companyId.trim()) throw new Error("missing_company_id"); }
export async function listServiceBookingAssignments(companyId: string, filter: ServiceBookingAssignmentFilter, dependencies: Dependencies = {}) { requireCompany(companyId); return (dependencies.list ?? listDb)(companyId, filter); }
export async function createServiceBookingAssignment(companyId: string, input: ServiceBookingAssignmentInput, dependencies: Dependencies = {}) { requireCompany(companyId); return (dependencies.create ?? createDb)(companyId, input); }
export async function updateServiceBookingAssignment(companyId: string, id: string, input: ServiceBookingAssignmentInput, dependencies: Dependencies = {}) { requireCompany(companyId); return (dependencies.update ?? updateDb)(companyId, id, input); }
export async function deactivateServiceBookingAssignment(companyId: string, id: string, dependencies: Dependencies = {}) { requireCompany(companyId); return (dependencies.deactivate ?? deactivateDb)(companyId, id); }
