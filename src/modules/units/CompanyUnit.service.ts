import { and, asc, eq } from "drizzle-orm";
import { companyUnits } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import type { CompanyUnitInput } from "./CompanyUnit.schema";

export type CompanyUnit = typeof companyUnits.$inferSelect;

type Dependencies = {
  list?: (companyId: string) => Promise<CompanyUnit[]>;
  find?: (companyId: string, unitId: string) => Promise<CompanyUnit | null>;
  create?: (companyId: string, input: CompanyUnitInput) => Promise<CompanyUnit>;
  update?: (companyId: string, unitId: string, input: CompanyUnitInput) => Promise<CompanyUnit | null>;
};

const requireBoundary = (companyId: string) => {
  if (!companyId.trim()) throw new Error("missing_company_id");
};

async function listInDatabase(companyId: string) {
  return getDb().select().from(companyUnits)
    .where(eq(companyUnits.companyId, companyId))
    .orderBy(asc(companyUnits.active), asc(companyUnits.name));
}

async function findInDatabase(companyId: string, unitId: string) {
  const rows = await getDb().select().from(companyUnits)
    .where(and(eq(companyUnits.companyId, companyId), eq(companyUnits.id, unitId))).limit(1);
  return rows[0] ?? null;
}

async function createInDatabase(companyId: string, input: CompanyUnitInput) {
  return getDb().transaction(async (tx) => {
    const existing = await tx.select({ id: companyUnits.id }).from(companyUnits)
      .where(eq(companyUnits.companyId, companyId)).limit(1);
    const isDefault = existing.length === 0 || input.isDefault;
    if (isDefault && existing.length > 0) {
      await tx.update(companyUnits).set({ isDefault: false, updatedAt: new Date() })
        .where(eq(companyUnits.companyId, companyId));
    }
    const rows = await tx.insert(companyUnits).values({
      companyId,
      code: input.code!,
      name: input.name!,
      timeZone: input.timeZone ?? "America/Sao_Paulo",
      phone: input.phone ?? null,
      email: input.email ?? null,
      postalCode: input.postalCode ?? null,
      street: input.street ?? null,
      number: input.number ?? null,
      complement: input.complement ?? null,
      district: input.district ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      countryCode: input.countryCode ?? "BR",
      active: input.active ?? true,
      isDefault,
    }).returning();
    return rows[0]!;
  });
}

async function updateInDatabase(companyId: string, unitId: string, input: CompanyUnitInput) {
  return getDb().transaction(async (tx) => {
    if (input.isDefault) {
      await tx.update(companyUnits).set({ isDefault: false, updatedAt: new Date() })
        .where(eq(companyUnits.companyId, companyId));
    }
    const rows = await tx.update(companyUnits).set({ ...input, updatedAt: new Date() })
      .where(and(eq(companyUnits.companyId, companyId), eq(companyUnits.id, unitId))).returning();
    return rows[0] ?? null;
  });
}

export async function listCompanyUnits(companyId: string, dependencies: Dependencies = {}) {
  requireBoundary(companyId);
  return (dependencies.list ?? listInDatabase)(companyId);
}

export async function getCompanyUnit(companyId: string, unitId: string, dependencies: Dependencies = {}) {
  requireBoundary(companyId);
  if (!unitId.trim()) throw new Error("missing_unit_id");
  return (dependencies.find ?? findInDatabase)(companyId, unitId);
}

export async function createCompanyUnit(companyId: string, input: CompanyUnitInput, dependencies: Dependencies = {}) {
  requireBoundary(companyId);
  return (dependencies.create ?? createInDatabase)(companyId, input);
}

export async function updateCompanyUnit(companyId: string, unitId: string, input: CompanyUnitInput, dependencies: Dependencies = {}) {
  requireBoundary(companyId);
  if (!unitId.trim()) throw new Error("missing_unit_id");
  return (dependencies.update ?? updateInDatabase)(companyId, unitId, input);
}
