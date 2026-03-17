import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { companies } from "@/drizzle/schema";
import { getCurrentCompanyId } from "./getCurrentCompanyId";

export type CurrentCompanyContext = {
  id: string;
  name: string;
  businessType: string | null;
};

export async function getCurrentCompany(): Promise<CurrentCompanyContext | null> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return null;

  const db = getDb();

  const rows = await db
    .select({
      id: companies.id,
      name: companies.name,
      businessType: companies.businessType,
    })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  const company = rows[0];
  if (!company) return null;

  return {
    id: company.id,
    name: company.name,
    businessType: company.businessType ?? null,
  };
}
