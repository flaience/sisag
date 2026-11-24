import { and, asc, count, eq, inArray } from "drizzle-orm";
import { arrivalIntentions, companyUnits, serviceArrivalPeriods, services } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { createN8nAgentArrivalIntentionProposal, type ArrivalIntentionProposal, type TrustedArrivalPeriodTarget } from "./N8nAgentArrivalIntentionProposal";

type Input = { companyId: string; attendanceDate: string; message: string; correlationId: string };
type TrustedList = (input: { companyId: string; attendanceDate: string; limit: number }) => Promise<TrustedArrivalPeriodTarget[]>;

const weekday = (value: string) => new Date(value + "T12:00:00.000Z").getUTCDay();

async function listTrustedPeriods(input: { companyId: string; attendanceDate: string; limit: number }): Promise<TrustedArrivalPeriodTarget[]> {
  const db = getDb();
  const periods = await db.select({ periodId: serviceArrivalPeriods.id, serviceName: services.name, unitName: companyUnits.name, startTime: serviceArrivalPeriods.startTime, endTime: serviceArrivalPeriods.endTime, capacity: serviceArrivalPeriods.capacity }).from(serviceArrivalPeriods)
    .innerJoin(services, and(eq(services.companyId, input.companyId), eq(services.id, serviceArrivalPeriods.serviceId), eq(services.active, true), eq(services.attendanceMode, "arrival_order")))
    .innerJoin(companyUnits, and(eq(companyUnits.companyId, input.companyId), eq(companyUnits.id, serviceArrivalPeriods.unitId), eq(companyUnits.active, true)))
    .where(and(eq(serviceArrivalPeriods.companyId, input.companyId), eq(serviceArrivalPeriods.weekday, weekday(input.attendanceDate)), eq(serviceArrivalPeriods.active, true)))
    .orderBy(asc(serviceArrivalPeriods.startTime)).limit(input.limit);
  if (periods.length === 0) return [];
  const totals = await db.select({ periodId: arrivalIntentions.periodId, value: count() }).from(arrivalIntentions).where(and(eq(arrivalIntentions.companyId, input.companyId), eq(arrivalIntentions.attendanceDate, input.attendanceDate), eq(arrivalIntentions.status, "registered"), inArray(arrivalIntentions.periodId, periods.map(item => item.periodId)))).groupBy(arrivalIntentions.periodId);
  const totalsByPeriod = new Map(totals.map(item => [item.periodId, item.value]));
  return periods.map(item => ({ ...item, registered: totalsByPeriod.get(item.periodId) ?? 0 }));
}

export type N8nAgentArrivalIntentionProposalReadModelResult =
  | { ok: true; status: "proposal_ready"; proposal: ArrivalIntentionProposal; candidateCount: number }
  | { ok: true; status: "not_resolved"; proposal: null; candidateCount: number };

export async function resolveN8nAgentArrivalIntentionProposalReadModel(input: Input, trustedList: TrustedList = listTrustedPeriods): Promise<N8nAgentArrivalIntentionProposalReadModelResult> {
  if (!input.companyId.trim()) throw new Error("missing_company_id");
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(input.attendanceDate)) throw new Error("invalid_attendance_date");
  const periods = (await trustedList({ companyId: input.companyId, attendanceDate: input.attendanceDate, limit: 5 })).slice(0, 5);
  const proposal = createN8nAgentArrivalIntentionProposal({ message: input.message, attendanceDate: input.attendanceDate, correlationId: input.correlationId, periods });
  return proposal ? { ok: true, status: "proposal_ready", proposal, candidateCount: periods.length } : { ok: true, status: "not_resolved", proposal: null, candidateCount: periods.length };
}
