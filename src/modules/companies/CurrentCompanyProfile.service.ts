import { eq } from "drizzle-orm";
import { companies, companyUnits } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { buildCompanyUnitCode } from "@/modules/units/CompanyUnit.presentation";
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

export function choosePrimaryLocationCode(companyName: string, existingCodes: string[]) {
  const base = buildCompanyUnitCode(companyName);
  const used = new Set(existingCodes);
  if (!used.has(base)) return base;
  let suffix = 2;
  let candidate = "";
  do {
    const suffixText = `-${suffix}`;
    candidate = `${base.slice(0, 40 - suffixText.length)}${suffixText}`;
    suffix += 1;
  } while (used.has(candidate));
  return candidate;
}

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
  return getDb().transaction(async (tx) => {
    const rows = await tx.update(companies).set({
      name: input.name!,
      documentNumber: input.document ?? null,
      address: input.address ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      businessType: input.businessType ?? "generic",
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
    const profile = rows[0];
    if (!profile) return null;

    const locations = await tx.select({ code: companyUnits.code, isDefault: companyUnits.isDefault })
      .from(companyUnits).where(eq(companyUnits.companyId, companyId));
    if (!locations.some((item) => item.isDefault)) {
      await tx.insert(companyUnits).values({
        companyId,
        code: choosePrimaryLocationCode(profile.name, locations.map((item) => item.code)),
        name: profile.name,
        phone: profile.phone,
        email: profile.email,
        street: profile.address,
        timeZone: "America/Sao_Paulo",
        countryCode: "BR",
        isDefault: true,
        active: true,
      });
    }
    return profile;
  });
}

export async function getCurrentCompanyProfile(companyId: string, dependencies: Dependencies = {}) {
  if (!companyId.trim()) throw new Error("missing_company_id");
  return (dependencies.find ?? findInDatabase)(companyId);
}

export async function updateCurrentCompanyProfile(companyId: string, input: CurrentCompanyProfileInput, dependencies: Dependencies = {}) {
  if (!companyId.trim()) throw new Error("missing_company_id");
  return (dependencies.update ?? updateInDatabase)(companyId, input);
}
