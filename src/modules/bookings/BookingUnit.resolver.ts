import { companyUnits, professionalUnits } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { and, asc, desc, eq } from "drizzle-orm";

export type BookingUnitCandidate = {
  unitId: string;
  isPrimary?: boolean;
  isDefault?: boolean;
  createdAt?: Date | null;
};

export function chooseBookingUnitCandidate(candidates: BookingUnitCandidate[]) {
  return [...candidates].sort((left, right) => {
    const leftPreferred = Number(Boolean(left.isPrimary || left.isDefault));
    const rightPreferred = Number(Boolean(right.isPrimary || right.isDefault));
    if (leftPreferred !== rightPreferred) return rightPreferred - leftPreferred;
    return (left.createdAt?.getTime() ?? 0) - (right.createdAt?.getTime() ?? 0);
  })[0]?.unitId ?? null;
}

export async function resolveBookingUnit(input: {
  companyId: string;
  professionalId?: string;
  unitId?: string;
}) {
  const db = getDb();

  if (input.unitId) {
    const rows = input.professionalId
      ? await db.select({ unitId: companyUnits.id })
          .from(companyUnits)
          .innerJoin(professionalUnits, and(
            eq(professionalUnits.companyId, input.companyId),
            eq(professionalUnits.professionalId, input.professionalId),
            eq(professionalUnits.unitId, companyUnits.id),
            eq(professionalUnits.active, true),
          ))
          .where(and(eq(companyUnits.companyId, input.companyId), eq(companyUnits.id, input.unitId), eq(companyUnits.active, true)))
          .limit(1)
      : await db.select({ unitId: companyUnits.id })
          .from(companyUnits)
          .where(and(eq(companyUnits.companyId, input.companyId), eq(companyUnits.id, input.unitId), eq(companyUnits.active, true)))
          .limit(1);
    return rows[0]?.unitId ?? null;
  }

  if (input.professionalId) {
    const rows = await db.select({ unitId: professionalUnits.unitId })
      .from(professionalUnits)
      .innerJoin(companyUnits, and(
        eq(companyUnits.companyId, input.companyId),
        eq(companyUnits.id, professionalUnits.unitId),
        eq(companyUnits.active, true),
      ))
      .where(and(
        eq(professionalUnits.companyId, input.companyId),
        eq(professionalUnits.professionalId, input.professionalId),
        eq(professionalUnits.active, true),
      ))
      .orderBy(desc(professionalUnits.isPrimary), asc(professionalUnits.createdAt))
      .limit(1);
    if (rows[0]) return rows[0].unitId;
  }

  const rows = await db.select({ unitId: companyUnits.id })
    .from(companyUnits)
    .where(and(eq(companyUnits.companyId, input.companyId), eq(companyUnits.active, true)))
    .orderBy(desc(companyUnits.isDefault), asc(companyUnits.createdAt))
    .limit(1);
  return rows[0]?.unitId ?? null;
}
