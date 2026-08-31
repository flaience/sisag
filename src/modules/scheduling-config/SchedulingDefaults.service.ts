import { and, eq, or } from "drizzle-orm";
import { companyUnits, professionalServices, professionalUnits, professionals, services } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export type SchedulingDefaultsInput = {
  defaultUnitId?: string | null;
  defaultServiceId?: string | null;
  defaultProfessionalId?: string | null;
};

export class SchedulingDefaultsError extends Error {
  constructor(public readonly code: "invalid_default_unit" | "invalid_default_service" | "invalid_default_professional" | "default_professional_not_available_at_unit" | "default_professional_does_not_perform_service") {
    super(code);
  }
}

export async function validateSchedulingDefaults(companyId: string, input: SchedulingDefaultsInput) {
  const db = getDb();
  const unitId = input.defaultUnitId ?? null;
  const serviceId = input.defaultServiceId ?? null;
  const professionalId = input.defaultProfessionalId ?? null;

  if (unitId) {
    const rows = await db.select({ id: companyUnits.id }).from(companyUnits).where(and(eq(companyUnits.companyId, companyId), eq(companyUnits.id, unitId), eq(companyUnits.active, true))).limit(1);
    if (!rows[0]) throw new SchedulingDefaultsError("invalid_default_unit");
  }
  if (serviceId) {
    const rows = await db.select({ id: services.id }).from(services).where(and(eq(services.companyId, companyId), eq(services.id, serviceId), eq(services.active, true))).limit(1);
    if (!rows[0]) throw new SchedulingDefaultsError("invalid_default_service");
  }
  if (professionalId) {
    const rows = await db.select({ id: professionals.id }).from(professionals).where(and(eq(professionals.companyId, companyId), eq(professionals.id, professionalId), or(eq(professionals.status, "active"), eq(professionals.status, "ACTIVE"))!)).limit(1);
    if (!rows[0]) throw new SchedulingDefaultsError("invalid_default_professional");
  }
  if (unitId && professionalId) {
    const rows = await db.select({ id: professionalUnits.id }).from(professionalUnits).where(and(eq(professionalUnits.companyId, companyId), eq(professionalUnits.unitId, unitId), eq(professionalUnits.professionalId, professionalId), eq(professionalUnits.active, true))).limit(1);
    if (!rows[0]) throw new SchedulingDefaultsError("default_professional_not_available_at_unit");
  }
  if (serviceId && professionalId) {
    const rows = await db.select({ id: professionalServices.id }).from(professionalServices).where(and(eq(professionalServices.companyId, companyId), eq(professionalServices.serviceId, serviceId), eq(professionalServices.professionalId, professionalId), eq(professionalServices.active, true))).limit(1);
    if (!rows[0]) throw new SchedulingDefaultsError("default_professional_does_not_perform_service");
  }
}
