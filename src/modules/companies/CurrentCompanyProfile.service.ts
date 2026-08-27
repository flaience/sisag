import { eq } from "drizzle-orm";
import { companies } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import type { CurrentCompanyProfileInput } from "./CurrentCompanyProfile.schema";

export type CurrentCompanyProfile = {
  id: string;
  name: string;
  document: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  businessType: string;
};

type Dependencies = {
  find?: (companyId: string) => Promise<CurrentCompanyProfile | null>;
  update?: (companyId: string, input: CurrentCompanyProfileInput) => Promise<CurrentCompanyProfile | null>;
};

async function findInDatabase(companyId: string): Promise<CurrentCompanyProfile | null> {
  const rows = await getDb().select({
    id: companies.id,
    name: companies.name,
    document: companies.documentNumber,
    address: companies.address,
    phone: companies.phone,
    email: companies.email,
    businessType: companies.businessType,
  }).from(companies).where(eq(companies.id, companyId)).limit(1);
  return rows[0] ?? null;
}

async function updateInDatabase(companyId: string, input: CurrentCompanyProfileInput): Promise<CurrentCompanyProfile | null> {
  const rows = await getDb().update(companies).set({
    name: input.name,
    documentNumber: input.document,
    address: input.address,
    phone: input.phone,
    email: input.email,
    businessType: input.businessType,
    updatedAt: new Date(),
  }).where(eq(companies.id, companyId)).returning({
    id: companies.id,
    name: companies.name,
    document: companies.documentNumber,
    address: companies.address,
    phone: companies.phone,
    email: companies.email,
    businessType: companies.businessType,
  });
  return rows[0] ?? null;
}

export async function getCurrentCompanyProfile(companyId: string, dependencies: Dependencies = {}) {
  if (!companyId.trim()) throw new Error("missing_company_id");
  return (dependencies.find ?? findInDatabase)(companyId);
}

export async function updateCurrentCompanyProfile(companyId: string, input: CurrentCompanyProfileInput, dependencies: Dependencies = {}) {
  if (!companyId.trim()) throw new Error("missing_company_id");
  return (dependencies.update ?? updateInDatabase)(companyId, input);
}
