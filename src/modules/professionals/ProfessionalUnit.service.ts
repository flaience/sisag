import { and, asc, eq } from "drizzle-orm";
import { companyUnits, professionals, professionalUnits } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import type { ProfessionalUnitLinkInput } from "./ProfessionalUnit.schema";

export class ProfessionalUnitError extends Error {
  constructor(public code: "professional_not_found" | "unit_not_found" | "link_not_found") { super(code); }
}
export type ProfessionalUnitItem = { id: string; professionalId: string; unitId: string; unitName: string; isPrimary: boolean; active: boolean };
type Dependencies = {
  list?: (companyId: string, professionalId: string) => Promise<ProfessionalUnitItem[]>;
  link?: (companyId: string, professionalId: string, input: ProfessionalUnitLinkInput) => Promise<ProfessionalUnitItem>;
  deactivate?: (companyId: string, professionalId: string, unitId: string) => Promise<ProfessionalUnitItem>;
};
const requireBoundary = (companyId: string, professionalId: string) => { if (!companyId.trim()) throw new Error("missing_company_id"); if (!professionalId.trim()) throw new Error("missing_professional_id"); };
const selection = { id: professionalUnits.id, professionalId: professionalUnits.professionalId, unitId: professionalUnits.unitId, unitName: companyUnits.name, isPrimary: professionalUnits.isPrimary, active: professionalUnits.active };

async function listInDatabase(companyId: string, professionalId: string) {
  return getDb().select(selection).from(professionalUnits).innerJoin(companyUnits, and(eq(companyUnits.companyId, companyId), eq(companyUnits.id, professionalUnits.unitId))).where(and(eq(professionalUnits.companyId, companyId), eq(professionalUnits.professionalId, professionalId))).orderBy(asc(professionalUnits.active), asc(companyUnits.name));
}
async function linkInDatabase(companyId: string, professionalId: string, input: ProfessionalUnitLinkInput) {
  return getDb().transaction(async (tx) => {
    const professional = await tx.select({ id: professionals.id }).from(professionals).where(and(eq(professionals.companyId, companyId), eq(professionals.id, professionalId))).limit(1);
    if (!professional[0]) throw new ProfessionalUnitError("professional_not_found");
    const unit = await tx.select({ id: companyUnits.id, name: companyUnits.name }).from(companyUnits).where(and(eq(companyUnits.companyId, companyId), eq(companyUnits.id, input.unitId), eq(companyUnits.active, true))).limit(1);
    if (!unit[0]) throw new ProfessionalUnitError("unit_not_found");
    const existing = await tx.select({ id: professionalUnits.id, isPrimary: professionalUnits.isPrimary }).from(professionalUnits).where(and(eq(professionalUnits.companyId, companyId), eq(professionalUnits.professionalId, professionalId), eq(professionalUnits.unitId, input.unitId))).limit(1);
    const active = await tx.select({ id: professionalUnits.id }).from(professionalUnits).where(and(eq(professionalUnits.companyId, companyId), eq(professionalUnits.professionalId, professionalId), eq(professionalUnits.active, true))).limit(1);
    const isPrimary = input.isPrimary || active.length === 0 || existing[0]?.isPrimary === true;
    if (isPrimary) await tx.update(professionalUnits).set({ isPrimary: false, updatedAt: new Date() }).where(and(eq(professionalUnits.companyId, companyId), eq(professionalUnits.professionalId, professionalId)));
    const rows = existing[0]
      ? await tx.update(professionalUnits).set({ active: true, isPrimary, updatedAt: new Date() }).where(eq(professionalUnits.id, existing[0].id)).returning({ id: professionalUnits.id, professionalId: professionalUnits.professionalId, unitId: professionalUnits.unitId, isPrimary: professionalUnits.isPrimary, active: professionalUnits.active })
      : await tx.insert(professionalUnits).values({ companyId, professionalId, unitId: input.unitId, active: true, isPrimary }).returning({ id: professionalUnits.id, professionalId: professionalUnits.professionalId, unitId: professionalUnits.unitId, isPrimary: professionalUnits.isPrimary, active: professionalUnits.active });
    return { ...rows[0]!, unitName: unit[0].name };
  });
}
async function deactivateInDatabase(companyId: string, professionalId: string, unitId: string) {
  return getDb().transaction(async (tx) => {
    const rows = await tx.select({ id: professionalUnits.id, isPrimary: professionalUnits.isPrimary }).from(professionalUnits).where(and(eq(professionalUnits.companyId, companyId), eq(professionalUnits.professionalId, professionalId), eq(professionalUnits.unitId, unitId), eq(professionalUnits.active, true))).limit(1);
    const current = rows[0]; if (!current) throw new ProfessionalUnitError("link_not_found");
    await tx.update(professionalUnits).set({ active: false, isPrimary: false, updatedAt: new Date() }).where(eq(professionalUnits.id, current.id));
    if (current.isPrimary) { const replacement = await tx.select({ id: professionalUnits.id }).from(professionalUnits).where(and(eq(professionalUnits.companyId, companyId), eq(professionalUnits.professionalId, professionalId), eq(professionalUnits.active, true))).orderBy(asc(professionalUnits.createdAt)).limit(1); if (replacement[0]) await tx.update(professionalUnits).set({ isPrimary: true, updatedAt: new Date() }).where(eq(professionalUnits.id, replacement[0].id)); }
    const unit = await tx.select({ name: companyUnits.name }).from(companyUnits).where(and(eq(companyUnits.companyId, companyId), eq(companyUnits.id, unitId))).limit(1);
    return { id: current.id, professionalId, unitId, unitName: unit[0]?.name ?? "Local", isPrimary: false, active: false };
  });
}

export async function listProfessionalUnits(companyId: string, professionalId: string, dependencies: Dependencies = {}) { requireBoundary(companyId, professionalId); return (dependencies.list ?? listInDatabase)(companyId, professionalId); }
export async function linkProfessionalUnit(companyId: string, professionalId: string, input: ProfessionalUnitLinkInput, dependencies: Dependencies = {}) { requireBoundary(companyId, professionalId); return (dependencies.link ?? linkInDatabase)(companyId, professionalId, input); }
export async function deactivateProfessionalUnit(companyId: string, professionalId: string, unitId: string, dependencies: Dependencies = {}) { requireBoundary(companyId, professionalId); return (dependencies.deactivate ?? deactivateInDatabase)(companyId, professionalId, unitId); }
