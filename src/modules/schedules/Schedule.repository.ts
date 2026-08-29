import { and, asc, desc, eq, gt, lt, ne, sql } from "drizzle-orm";
import { appointments, companyUnits, professionalSchedules, professionalUnits, schedulingConfig } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import type { ScheduleDTO } from "./Schedule.schema";

export class ScheduleRepository {
  static list(companyId: string, professionalId: string) { return getDb().select({ id: professionalSchedules.id, companyId: professionalSchedules.companyId, professionalId: professionalSchedules.professionalId, unitId: professionalSchedules.unitId, unitName: companyUnits.name, weekday: professionalSchedules.weekday, startTime: professionalSchedules.startTime, endTime: professionalSchedules.endTime }).from(professionalSchedules).innerJoin(companyUnits, and(eq(companyUnits.companyId, companyId), eq(companyUnits.id, professionalSchedules.unitId))).where(and(eq(professionalSchedules.companyId, companyId), eq(professionalSchedules.professionalId, professionalId))).orderBy(asc(professionalSchedules.weekday), asc(professionalSchedules.startTime)); }
  static async find(companyId: string, professionalId: string, id: string) { const rows = await getDb().select().from(professionalSchedules).where(and(eq(professionalSchedules.companyId, companyId), eq(professionalSchedules.professionalId, professionalId), eq(professionalSchedules.id, id))).limit(1); return rows[0] ?? null; }
  static async defaultUnit(companyId: string, professionalId: string) { const rows = await getDb().select({ unitId: professionalUnits.unitId }).from(professionalUnits).where(and(eq(professionalUnits.companyId, companyId), eq(professionalUnits.professionalId, professionalId), eq(professionalUnits.active, true))).orderBy(desc(professionalUnits.isPrimary), asc(professionalUnits.createdAt)).limit(1); return rows[0]?.unitId ?? null; }
  static async unitIsActive(companyId: string, professionalId: string, unitId: string) { const rows = await getDb().select({ id: professionalUnits.id }).from(professionalUnits).where(and(eq(professionalUnits.companyId, companyId), eq(professionalUnits.professionalId, professionalId), eq(professionalUnits.unitId, unitId), eq(professionalUnits.active, true))).limit(1); return rows.length > 0; }
  static async overlaps(companyId: string, professionalId: string, unitId: string, data: ScheduleDTO, ignoreId?: string) { const filters = [eq(professionalSchedules.companyId, companyId), eq(professionalSchedules.professionalId, professionalId), eq(professionalSchedules.unitId, unitId), eq(professionalSchedules.weekday, data.weekday), lt(professionalSchedules.startTime, data.endTime), gt(professionalSchedules.endTime, data.startTime)]; if (ignoreId) filters.push(ne(professionalSchedules.id, ignoreId)); const rows = await getDb().select({ id: professionalSchedules.id }).from(professionalSchedules).where(and(...filters)).limit(1); return rows.length > 0; }
  static async create(companyId: string, professionalId: string, unitId: string, data: ScheduleDTO) { const rows = await getDb().insert(professionalSchedules).values({ companyId, professionalId, unitId, weekday: data.weekday, startTime: data.startTime, endTime: data.endTime }).returning(); return rows[0]!; }
  static async update(companyId: string, professionalId: string, id: string, unitId: string, data: ScheduleDTO) { const rows = await getDb().update(professionalSchedules).set({ unitId, weekday: data.weekday, startTime: data.startTime, endTime: data.endTime, updatedAt: new Date() }).where(and(eq(professionalSchedules.companyId, companyId), eq(professionalSchedules.professionalId, professionalId), eq(professionalSchedules.id, id))).returning(); return rows[0] ?? null; }
  static async remove(companyId: string, professionalId: string, id: string) { const rows = await getDb().delete(professionalSchedules).where(and(eq(professionalSchedules.companyId, companyId), eq(professionalSchedules.professionalId, professionalId), eq(professionalSchedules.id, id))).returning({ id: professionalSchedules.id }); return rows.length > 0; }
  static async getConfig(companyId: string) {
    const rows = await getDb().select({ timezone: schedulingConfig.timezone, slotDurationMinutes: schedulingConfig.slotDurationMinutes, bufferMinutes: schedulingConfig.bufferMinutes, allowOverbooking: schedulingConfig.allowOverbooking, maxAdvanceDays: schedulingConfig.maxAdvanceDays, minCancelAdvanceMinutes: schedulingConfig.minCancelAdvanceMinutes }).from(schedulingConfig).where(eq(schedulingConfig.companyId, companyId)).limit(1);
    const config = rows[0];
    return { timezone: config?.timezone ?? "America/Sao_Paulo", slotDurationMinutes: config?.slotDurationMinutes ?? 15, bufferMinutes: config?.bufferMinutes ?? 5, allowOverbooking: config?.allowOverbooking ?? false, maxAdvanceDays: config?.maxAdvanceDays ?? 30, minCancelAdvanceMinutes: config?.minCancelAdvanceMinutes ?? 0 };
  }

  static async hasConflict(params: { companyId: string; professionalId: string; scheduled: Date; slotDurationMinutes: number; bufferMinutes: number; appointmentIdToIgnore?: string | null }) {
    const windowMinutes = Math.max(1, params.slotDurationMinutes + params.bufferMinutes);
    const from = new Date(params.scheduled.getTime() - windowMinutes * 60_000);
    const to = new Date(params.scheduled.getTime() + windowMinutes * 60_000);
    const filters = [eq(appointments.companyId, params.companyId), eq(appointments.professionalId, params.professionalId), ne(appointments.status, "CANCELLED"), sql`${appointments.scheduledTime} >= ${from} AND ${appointments.scheduledTime} <= ${to}`];
    if (params.appointmentIdToIgnore) filters.push(ne(appointments.id, params.appointmentIdToIgnore));
    const rows = await getDb().select({ id: appointments.id }).from(appointments).where(and(...filters)).limit(1);
    return rows.length > 0;
  }

}
