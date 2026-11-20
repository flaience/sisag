import { and, asc, eq } from "drizzle-orm";
import { companyUnits, serviceArrivalPeriods, services } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import type { ServiceArrivalPeriodFilter, ServiceArrivalPeriodInput } from "./ServiceArrivalPeriod.schema";

export class ServiceArrivalPeriodError extends Error {
  constructor(public readonly code: "unit_not_found" | "arrival_order_service_not_found" | "arrival_period_not_found") { super(code); }
}

type Dependencies = {
  list?: (companyId: string, filter: ServiceArrivalPeriodFilter) => Promise<unknown[]>;
  create?: (companyId: string, input: ServiceArrivalPeriodInput) => Promise<unknown>;
  update?: (companyId: string, id: string, input: ServiceArrivalPeriodInput) => Promise<unknown>;
  deactivate?: (companyId: string, id: string) => Promise<unknown>;
};

const requireCompany = (companyId: string) => { if (!companyId.trim()) throw new Error("missing_company_id"); };

async function validateReferences(companyId: string, input: ServiceArrivalPeriodInput) {
  const db = getDb();
  const [unit, service] = await Promise.all([
    db.select({ id: companyUnits.id }).from(companyUnits).where(and(eq(companyUnits.companyId, companyId), eq(companyUnits.id, input.unitId), eq(companyUnits.active, true))).limit(1),
    db.select({ id: services.id }).from(services).where(and(eq(services.companyId, companyId), eq(services.id, input.serviceId), eq(services.active, true), eq(services.attendanceMode, "arrival_order"))).limit(1),
  ]);
  if (!unit[0]) throw new ServiceArrivalPeriodError("unit_not_found");
  if (!service[0]) throw new ServiceArrivalPeriodError("arrival_order_service_not_found");
}

async function listDb(companyId: string, filter: ServiceArrivalPeriodFilter) {
  const conditions = [eq(serviceArrivalPeriods.companyId, companyId)];
  if (filter.unitId) conditions.push(eq(serviceArrivalPeriods.unitId, filter.unitId));
  if (filter.serviceId) conditions.push(eq(serviceArrivalPeriods.serviceId, filter.serviceId));
  if (filter.weekday !== undefined) conditions.push(eq(serviceArrivalPeriods.weekday, filter.weekday));
  if (filter.status === "active") conditions.push(eq(serviceArrivalPeriods.active, true));
  if (filter.status === "inactive") conditions.push(eq(serviceArrivalPeriods.active, false));
  return getDb().select().from(serviceArrivalPeriods).where(and(...conditions)).orderBy(asc(serviceArrivalPeriods.weekday), asc(serviceArrivalPeriods.startTime));
}

async function createDb(companyId: string, input: ServiceArrivalPeriodInput) {
  await validateReferences(companyId, input);
  const rows = await getDb().insert(serviceArrivalPeriods).values({ companyId, ...input }).returning();
  return rows[0]!;
}

async function updateDb(companyId: string, id: string, input: ServiceArrivalPeriodInput) {
  const current = await getDb().select({ id: serviceArrivalPeriods.id }).from(serviceArrivalPeriods).where(and(eq(serviceArrivalPeriods.companyId, companyId), eq(serviceArrivalPeriods.id, id))).limit(1);
  if (!current[0]) throw new ServiceArrivalPeriodError("arrival_period_not_found");
  await validateReferences(companyId, input);
  const rows = await getDb().update(serviceArrivalPeriods).set({ ...input, updatedAt: new Date() }).where(and(eq(serviceArrivalPeriods.companyId, companyId), eq(serviceArrivalPeriods.id, id))).returning();
  return rows[0]!;
}

async function deactivateDb(companyId: string, id: string) {
  const rows = await getDb().update(serviceArrivalPeriods).set({ active: false, updatedAt: new Date() }).where(and(eq(serviceArrivalPeriods.companyId, companyId), eq(serviceArrivalPeriods.id, id))).returning();
  if (!rows[0]) throw new ServiceArrivalPeriodError("arrival_period_not_found");
  return rows[0];
}

export async function listServiceArrivalPeriods(companyId: string, filter: ServiceArrivalPeriodFilter, dependencies: Dependencies = {}) { requireCompany(companyId); return (dependencies.list ?? listDb)(companyId, filter); }
export async function createServiceArrivalPeriod(companyId: string, input: ServiceArrivalPeriodInput, dependencies: Dependencies = {}) { requireCompany(companyId); return (dependencies.create ?? createDb)(companyId, input); }
export async function updateServiceArrivalPeriod(companyId: string, id: string, input: ServiceArrivalPeriodInput, dependencies: Dependencies = {}) { requireCompany(companyId); return (dependencies.update ?? updateDb)(companyId, id, input); }
export async function deactivateServiceArrivalPeriod(companyId: string, id: string, dependencies: Dependencies = {}) { requireCompany(companyId); return (dependencies.deactivate ?? deactivateDb)(companyId, id); }
