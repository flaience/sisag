import { and, count, eq } from "drizzle-orm";
import { arrivalIntentions, clients, serviceArrivalPeriods, services } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { decideArrivalIntention } from "./ArrivalIntention";
import type { ArrivalIntentionInput } from "./ArrivalIntention.schema";

export class ArrivalIntentionError extends Error {
  constructor(public readonly code: "arrival_period_not_found" | "client_not_found" | "period_weekday_mismatch" | "period_capacity_exhausted" | "arrival_intention_not_found") { super(code); }
}

type Dependencies = {
  register?: (companyId: string, input: ArrivalIntentionInput) => Promise<unknown>;
  cancel?: (companyId: string, intentionId: string) => Promise<unknown>;
};
const requireCompany = (companyId: string) => { if (!companyId.trim()) throw new Error("missing_company_id"); };

async function registerDb(companyId: string, input: ArrivalIntentionInput) {
  return getDb().transaction(async (tx) => {
    const previous = await tx.select().from(arrivalIntentions).where(and(eq(arrivalIntentions.companyId, companyId), eq(arrivalIntentions.requestId, input.requestId))).limit(1);
    if (previous[0]) return previous[0];
    const period = await tx.select({ id: serviceArrivalPeriods.id, weekday: serviceArrivalPeriods.weekday, capacity: serviceArrivalPeriods.capacity }).from(serviceArrivalPeriods).innerJoin(services, and(eq(services.companyId, companyId), eq(services.id, serviceArrivalPeriods.serviceId), eq(services.active, true), eq(services.attendanceMode, "arrival_order"))).where(and(eq(serviceArrivalPeriods.companyId, companyId), eq(serviceArrivalPeriods.id, input.periodId), eq(serviceArrivalPeriods.active, true))).limit(1).for("update");
    if (!period[0]) throw new ArrivalIntentionError("arrival_period_not_found");
    const client = await tx.select({ id: clients.id }).from(clients).where(and(eq(clients.companyId, companyId), eq(clients.id, input.clientId))).limit(1);
    if (!client[0]) throw new ArrivalIntentionError("client_not_found");
    const existing = await tx.select().from(arrivalIntentions).where(and(eq(arrivalIntentions.companyId, companyId), eq(arrivalIntentions.periodId, input.periodId), eq(arrivalIntentions.clientId, input.clientId), eq(arrivalIntentions.attendanceDate, input.attendanceDate), eq(arrivalIntentions.status, "registered"))).limit(1);
    if (existing[0]) return existing[0];
    const totals = await tx.select({ value: count() }).from(arrivalIntentions).where(and(eq(arrivalIntentions.companyId, companyId), eq(arrivalIntentions.periodId, input.periodId), eq(arrivalIntentions.attendanceDate, input.attendanceDate), eq(arrivalIntentions.status, "registered")));
    const decision = decideArrivalIntention({ attendanceDate: input.attendanceDate, periodWeekday: period[0].weekday, capacity: period[0].capacity, registered: totals[0]?.value ?? 0 });
    if (!decision.accepted) throw new ArrivalIntentionError(decision.reason);
    const rows = await tx.insert(arrivalIntentions).values({ companyId, ...input, status: "registered" }).returning();
    return rows[0]!;
  });
}

async function cancelDb(companyId: string, intentionId: string) {
  const rows = await getDb().update(arrivalIntentions).set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() }).where(and(eq(arrivalIntentions.companyId, companyId), eq(arrivalIntentions.id, intentionId), eq(arrivalIntentions.status, "registered"))).returning();
  if (!rows[0]) throw new ArrivalIntentionError("arrival_intention_not_found");
  return rows[0];
}

export async function registerArrivalIntention(companyId: string, input: ArrivalIntentionInput, dependencies: Dependencies = {}) { requireCompany(companyId); return (dependencies.register ?? registerDb)(companyId, input); }
export async function cancelArrivalIntention(companyId: string, intentionId: string, dependencies: Dependencies = {}) { requireCompany(companyId); return (dependencies.cancel ?? cancelDb)(companyId, intentionId); }
