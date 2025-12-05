// src/modules/scheduling/scheduling-config.service.ts
import { db } from "@/lib/db";
import {
  schedulingConfig,
  professionalSchedules,
  appointments,
} from "@/drizzle/schema";
import { eq, and, gte, lt } from "drizzle-orm";
import { generateIntervals, toMinutes } from "@/lib/time";

export class SchedulingEngine {
  static async getAvailableSlots(professionalId: string, date: string) {
    // → 1. Buscar config
    const [config] = await db.select().from(schedulingConfig).limit(1);

    if (!config) throw new Error("Config não encontrada");

    const {
      slotDurationMinutes,
      bufferMinutes,
      maxAdvanceDays,
      allowOverbooking,
    } = config;
    const totalSlot = slotDurationMinutes + bufferMinutes;

    // → 2. Validar maxAdvanceDays
    const today = new Date();
    const target = new Date(date);
    const diffDays = Math.floor(
      (target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (diffDays < 0 || diffDays > maxAdvanceDays) {
      return [];
    }

    // → 3. Buscar disponibilidade semanal
    const weekday = target.getDay();

    const daySchedules = await db
      .select()
      .from(professionalSchedules)
      .where(
        and(
          eq(professionalSchedules.professionalId, professionalId),
          eq(professionalSchedules.weekday, weekday)
        )
      );

    if (daySchedules.length === 0) return [];

    // → 4. Gerar todos os intervalos possíveis
    let slots: string[] = [];

    for (const block of daySchedules) {
      const intervals = generateIntervals(
        block.startTime,
        block.endTime,
        totalSlot
      );
      slots.push(...intervals);
    }

    // → 5. Buscar appointments ocupados
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const busy = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.professionalId, professionalId),
          gte(appointments.scheduledTime, new Date(date)),
          lt(appointments.scheduledTime, nextDay),
          eq(appointments.status, "CONFIRMED")
        )
      );

    if (!allowOverbooking) {
      const busyTimes = busy.map(
        (a) =>
          `${String(new Date(a.scheduledTime).getHours()).padStart(
            2,
            "0"
          )}:${String(new Date(a.scheduledTime).getMinutes()).padStart(2, "0")}`
      );

      slots = slots.filter((s) => !busyTimes.includes(s));
    }

    return slots;
  }
}
