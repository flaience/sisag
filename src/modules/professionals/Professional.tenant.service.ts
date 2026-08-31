import { and, desc, eq, ilike, or } from "drizzle-orm";
import { professionals, professionalUnits } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export type ProfessionalStatusFilter = "active" | "inactive" | "all";
export type ProfessionalInput = { name: string; specialty: string | null; status: "ACTIVE" | "INACTIVE"; avgDuration: number };
type Dependencies = {
  list?: (companyId: string, search: string, status: ProfessionalStatusFilter, unitId?: string) => Promise<unknown[]>;
  find?: (companyId: string, professionalId: string) => Promise<unknown | null>;
  create?: (companyId: string, input: ProfessionalInput) => Promise<unknown>;
  update?: (companyId: string, professionalId: string, input: ProfessionalInput) => Promise<unknown | null>;
  deactivate?: (companyId: string, professionalId: string) => Promise<unknown | null>;
};

const requireCompany = (companyId: string) => { if (!companyId.trim()) throw new Error("missing_company_id"); };
const selection = { id: professionals.id, companyId: professionals.companyId, name: professionals.name, specialty: professionals.specialty, photoUrl: professionals.photoUrl, status: professionals.status, avgDuration: professionals.avgDurationMinutes, resourceId: professionals.resourceId, createdAt: professionals.createdAt, updatedAt: professionals.updatedAt };

async function listInDatabase(companyId: string, search: string, status: ProfessionalStatusFilter, unitId?: string) {
  const filters = [eq(professionals.companyId, companyId)];
  if (search) filters.push(ilike(professionals.name, "%" + search + "%"));
  if (status === "active") filters.push(or(eq(professionals.status, "ACTIVE"), eq(professionals.status, "active"))!);
  if (status === "inactive") filters.push(or(eq(professionals.status, "INACTIVE"), eq(professionals.status, "inactive"))!);
  const query = getDb().select(selection).from(professionals);
  if (unitId) {
    filters.push(eq(professionalUnits.companyId, companyId), eq(professionalUnits.unitId, unitId), eq(professionalUnits.active, true));
    return query.innerJoin(professionalUnits, eq(professionalUnits.professionalId, professionals.id)).where(and(...filters)).orderBy(desc(professionals.createdAt));
  }
  return query.where(and(...filters)).orderBy(desc(professionals.createdAt));
}
async function findInDatabase(companyId: string, professionalId: string) {
  const rows = await getDb().select(selection).from(professionals).where(and(eq(professionals.companyId, companyId), eq(professionals.id, professionalId))).limit(1);
  return rows[0] ?? null;
}
async function createInDatabase(companyId: string, input: ProfessionalInput) {
  const rows = await getDb().insert(professionals).values({ companyId, name: input.name, specialty: input.specialty, status: input.status, avgDurationMinutes: input.avgDuration }).returning(selection);
  return rows[0];
}
async function updateInDatabase(companyId: string, professionalId: string, input: ProfessionalInput) {
  const rows = await getDb().update(professionals).set({ name: input.name, specialty: input.specialty, status: input.status, avgDurationMinutes: input.avgDuration, updatedAt: new Date() }).where(and(eq(professionals.companyId, companyId), eq(professionals.id, professionalId))).returning(selection);
  return rows[0] ?? null;
}
async function deactivateInDatabase(companyId: string, professionalId: string) {
  const rows = await getDb().update(professionals).set({ status: "INACTIVE", updatedAt: new Date() }).where(and(eq(professionals.companyId, companyId), eq(professionals.id, professionalId))).returning(selection);
  return rows[0] ?? null;
}

export async function listCompanyProfessionals(companyId: string, search = "", status: ProfessionalStatusFilter = "active", dependencies: Dependencies = {}, unitId = "") { requireCompany(companyId); const list = dependencies.list ?? listInDatabase; return unitId ? list(companyId, search.trim(), status, unitId) : list(companyId, search.trim(), status); }
export async function getCompanyProfessional(companyId: string, professionalId: string, dependencies: Dependencies = {}) { requireCompany(companyId); return (dependencies.find ?? findInDatabase)(companyId, professionalId); }
export async function createCompanyProfessional(companyId: string, input: ProfessionalInput, dependencies: Dependencies = {}) { requireCompany(companyId); return (dependencies.create ?? createInDatabase)(companyId, input); }
export async function updateCompanyProfessional(companyId: string, professionalId: string, input: ProfessionalInput, dependencies: Dependencies = {}) { requireCompany(companyId); return (dependencies.update ?? updateInDatabase)(companyId, professionalId, input); }
export async function deactivateCompanyProfessional(companyId: string, professionalId: string, dependencies: Dependencies = {}) { requireCompany(companyId); return (dependencies.deactivate ?? deactivateInDatabase)(companyId, professionalId); }
