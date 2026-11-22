import { and, asc, count, eq, inArray } from "drizzle-orm";
import { arrivalIntentions, companyUnits, serviceArrivalPeriods, services } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import type { ArrivalDayPeriod } from "./N8nAgentArrivalOrderIntent";
import type { TrustedArrivalPeriodCandidate } from "./N8nAgentArrivalOrderAnswerCandidate";

type Input = { companyId: string; attendanceDate: string; dayPeriod: ArrivalDayPeriod; serviceText: string | null };
type RawPeriod = TrustedArrivalPeriodCandidate & { id: string };
type Load = (companyId: string, attendanceDate: string, weekday: number) => Promise<RawPeriod[]>;

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
const weekday = (value: string) => new Date(value + "T12:00:00.000Z").getUTCDay();
const minutes = (value: string) => { const [hour, minute] = value.split(":").map(Number); return hour * 60 + minute; };

function matchesDayPeriod(startTime: string, dayPeriod: ArrivalDayPeriod) {
  if (dayPeriod === null) return true;
  const start = minutes(startTime);
  if (dayPeriod === "morning") return start < 12 * 60;
  if (dayPeriod === "afternoon") return start >= 12 * 60 && start < 18 * 60;
  return start >= 18 * 60;
}

async function loadDb(companyId: string, attendanceDate: string, requestedWeekday: number): Promise<RawPeriod[]> {
  const db = getDb();
  const periods = await db.select({ id: serviceArrivalPeriods.id, serviceName: services.name, unitName: companyUnits.name, startTime: serviceArrivalPeriods.startTime, endTime: serviceArrivalPeriods.endTime, capacity: serviceArrivalPeriods.capacity }).from(serviceArrivalPeriods)
    .innerJoin(services, and(eq(services.companyId, companyId), eq(services.id, serviceArrivalPeriods.serviceId), eq(services.active, true), eq(services.attendanceMode, "arrival_order")))
    .innerJoin(companyUnits, and(eq(companyUnits.companyId, companyId), eq(companyUnits.id, serviceArrivalPeriods.unitId), eq(companyUnits.active, true)))
    .where(and(eq(serviceArrivalPeriods.companyId, companyId), eq(serviceArrivalPeriods.weekday, requestedWeekday), eq(serviceArrivalPeriods.active, true)))
    .orderBy(asc(serviceArrivalPeriods.startTime)).limit(50);
  if (periods.length === 0) return [];
  const totals = await db.select({ periodId: arrivalIntentions.periodId, value: count() }).from(arrivalIntentions).where(and(eq(arrivalIntentions.companyId, companyId), eq(arrivalIntentions.attendanceDate, attendanceDate), eq(arrivalIntentions.status, "registered"), inArray(arrivalIntentions.periodId, periods.map(item => item.id)))).groupBy(arrivalIntentions.periodId);
  const totalsByPeriod = new Map(totals.map(item => [item.periodId, item.value]));
  return periods.map(item => ({ ...item, registered: totalsByPeriod.get(item.id) ?? 0 }));
}

export async function listN8nAgentArrivalOrderPeriods(input: Input, load: Load = loadDb): Promise<{ ok: true; attendanceDate: string; periods: TrustedArrivalPeriodCandidate[] }> {
  if (!input.companyId.trim()) throw new Error("missing_company_id");
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(input.attendanceDate)) throw new Error("invalid_attendance_date");
  const requestedService = input.serviceText ? normalize(input.serviceText) : null;
  const periods = (await load(input.companyId, input.attendanceDate, weekday(input.attendanceDate)))
    .filter(item => matchesDayPeriod(item.startTime, input.dayPeriod))
    .filter(item => !requestedService || normalize(item.serviceName).includes(requestedService) || requestedService.includes(normalize(item.serviceName)))
    .filter(item => item.capacity === null || item.registered < item.capacity)
    .slice(0, 5)
    .map(({ serviceName, unitName, startTime, endTime, capacity, registered }) => ({ serviceName, unitName, startTime, endTime, capacity, registered }));
  return { ok: true, attendanceDate: input.attendanceDate, periods };
}
