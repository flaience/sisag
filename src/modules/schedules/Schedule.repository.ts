// src/modules/schedules/Schedule.repository.ts
import { getDb } from "@/lib/db";
import {
  appointments,
  professionalSchedules,
  schedulingConfig,
} from "@/drizzle/schema";
import { and, eq, ne, sql } from "drizzle-orm";

export class ScheduleRepository {
  // =========================
  // CRUD (já existente) - professionalSchedules
  // =========================
  static list(professionalId: string) {
    const db = getDb();
    return db
      .select()
      .from(professionalSchedules)
      .where(eq(professionalSchedules.professionalId, professionalId));
  }

  static async findById(id: string) {
    const db = getDb();
    const rows = await db
      .select()
      .from(professionalSchedules)
      .where(eq(professionalSchedules.id, id));
    return rows[0] ?? null;
  }

  static async create(professionalId: string, data: any) {
    const db = getDb();
    const [row] = await db
      .insert(professionalSchedules)
      .values({
        professionalId,
        weekday: data.weekday,
        startTime: data.startTime,
        endTime: data.endTime,
      })
      .returning();
    return row;
  }

  static async update(id: string, data: any) {
    const db = getDb();
    const [row] = await db
      .update(professionalSchedules)
      .set({
        weekday: data.weekday,
        startTime: data.startTime,
        endTime: data.endTime,
      })
      .where(eq(professionalSchedules.id, id))
      .returning();
    return row;
  }

  static async delete(id: string) {
    const db = getDb();
    await db
      .delete(professionalSchedules)
      .where(eq(professionalSchedules.id, id));
  }

  // =========================
  // Blindagem (produção real)
  // =========================

  static async getConfig(companyId: string) {
    const db = getDb();

    const rows = await db
      .select({
        slotDurationMinutes: schedulingConfig.slotDurationMinutes,
        bufferMinutes: schedulingConfig.bufferMinutes,
        allowOverbooking: schedulingConfig.allowOverbooking,
        maxAdvanceDays: schedulingConfig.maxAdvanceDays,
        minCancelAdvanceMinutes: schedulingConfig.minCancelAdvanceMinutes,
      })
      .from(schedulingConfig)
      .where(eq(schedulingConfig.companyId, companyId))
      .limit(1);

    const c = rows[0];

    return {
      slotDurationMinutes: c?.slotDurationMinutes ?? 15,
      bufferMinutes: c?.bufferMinutes ?? 5,
      allowOverbooking: c?.allowOverbooking ?? false,
      maxAdvanceDays: c?.maxAdvanceDays ?? 30,
      minCancelAdvanceMinutes: c?.minCancelAdvanceMinutes ?? 0,
    };
  }

  static async hasConflict(params: {
    companyId: string;
    professionalId: string;
    scheduled: Date; // UTC
    slotDurationMinutes: number;
    bufferMinutes: number;
    appointmentIdToIgnore?: string | null;
  }) {
    const db = getDb();

    // janela: slot + buffer (pra frente e pra trás)
    const windowMinutes = Math.max(
      1,
      params.slotDurationMinutes + params.bufferMinutes,
    );

    const from = new Date(params.scheduled.getTime() - windowMinutes * 60_000);
    const to = new Date(params.scheduled.getTime() + windowMinutes * 60_000);

    const whereParts: any[] = [
      eq(appointments.companyId, params.companyId),
      eq(appointments.professionalId, params.professionalId),
      ne(appointments.status, "CANCELLED"),
      sql`${appointments.scheduledTime} >= ${from} AND ${appointments.scheduledTime} <= ${to}`,
    ];

    if (params.appointmentIdToIgnore) {
      whereParts.push(ne(appointments.id, params.appointmentIdToIgnore));
    }

    const rows = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(and(...whereParts))
      .limit(1);

    return rows.length > 0;
  }
}
