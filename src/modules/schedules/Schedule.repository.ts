// src/modules/schedules/Schedule.repository.ts
import { getDb } from "@/lib/db";
import { professionalSchedules } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export class ScheduleRepository {
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
}
