import { and, asc, eq, ilike } from "drizzle-orm";
import { services } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export type ServiceListItem = {
  id: string;
  name: string;
  durationMinutes: number;
};

type Input = { companyId: string; search?: string };
type Dependencies = {
  query?: (input: { companyId: string; search: string }) => Promise<ServiceListItem[]>;
};

async function queryDatabase(input: { companyId: string; search: string }) {
  const filters = [eq(services.companyId, input.companyId)];
  if (input.search) filters.push(ilike(services.name, `%${input.search}%`));

  return getDb()
    .select({
      id: services.id,
      name: services.name,
      durationMinutes: services.durationMinutes,
    })
    .from(services)
    .where(and(...filters))
    .orderBy(asc(services.name));
}

export async function listServicesForCompany(input: Input, dependencies: Dependencies = {}) {
  const companyId = input.companyId.trim();
  if (!companyId) throw new Error("missing_company_id");
  const search = input.search?.trim() ?? "";
  return (dependencies.query ?? queryDatabase)({ companyId, search });
}
