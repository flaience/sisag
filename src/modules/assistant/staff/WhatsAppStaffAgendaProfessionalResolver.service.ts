import { and, asc, eq, inArray } from "drizzle-orm";
import { professionals } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

type ProfessionalOption = { id: string; name: string };

export type StaffAgendaProfessionalResolution =
  | { ok: true; professional: ProfessionalOption }
  | { ok: false; reason: "not_found" | "ambiguous" };

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function resolveProfessionalOptions(query: string, rows: ProfessionalOption[]): StaffAgendaProfessionalResolution {
  const target = normalize(query);
  if (!target) return { ok: false, reason: "not_found" };
  const matches = rows.filter((row) => {
    const name = normalize(row.name);
    return name === target || name.startsWith(target + " ") || name.split(" ").includes(target);
  });
  if (matches.length === 0) return { ok: false, reason: "not_found" };
  if (matches.length !== 1) return { ok: false, reason: "ambiguous" };
  return { ok: true, professional: matches[0] };
}

export async function resolveWhatsAppStaffAgendaProfessional(input: { companyId: string; name: string }): Promise<StaffAgendaProfessionalResolution> {
  const rows = await getDb()
    .select({ id: professionals.id, name: professionals.name })
    .from(professionals)
    .where(and(eq(professionals.companyId, input.companyId), inArray(professionals.status, ["active", "ACTIVE"])))
    .orderBy(asc(professionals.name));
  return resolveProfessionalOptions(input.name, rows);
}
