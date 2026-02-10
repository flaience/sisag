// src/domain/scheduling/SchedulingEngine.ts

/**
 * SchedulingEngine
 *
 * Responsável por gerar os horários disponíveis de um profissional em um dia.
 * NÃO cria agendamento.
 * NÃO salva nada.
 *
 * Recebe (professionalId, date) → retorna lista de times ["08:00", "08:20", ...].
 */

import { getDb } from "@/lib/db";
import {
  professionalSchedules,
  appointments,
  schedulingConfig,
} from "@/drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export class SchedulingEngine {
  static async getAvailableSlots(professionalId: string, date: string) {
    const db = getDb();

    const [config] = await db.select().from(schedulingConfig).limit(1);
    const slotDuration = config?.slotDurationMinutes ?? 20;
    const bufferMinutes = config?.bufferMinutes ?? 5;
    const allowOverbooking = config?.allowOverbooking ?? false;

    const weekday = new Date(`${date}T00:00:00`).getDay();

    const schedules = await db
      .select()
      .from(professionalSchedules)
      .where(
        and(
          eq(professionalSchedules.professionalId, professionalId),
          eq(professionalSchedules.weekday, weekday),
        ),
      );

    if (schedules.length === 0) return [];

    const rawSlots: string[] = [];

    for (const sch of schedules) {
      const start = SchedulingEngine.toMinutes(sch.startTime);
      const end = SchedulingEngine.toMinutes(sch.endTime);

      for (
        let t = start;
        t + slotDuration <= end;
        t += slotDuration + bufferMinutes
      ) {
        rawSlots.push(SchedulingEngine.toHHMM(t));
      }
    }

    if (rawSlots.length === 0) return [];

    // Local time bounds (evita bug de timezone)
    const startDay = new Date(`${date}T00:00:00`);
    const endDay = new Date(`${date}T23:59:59.999`);

    const booked = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.professionalId, professionalId),
          gte(appointments.scheduledTime, startDay),
          lte(appointments.scheduledTime, endDay),
        ),
      );

    const takenSlots = new Set(
      booked.map((b) => {
        const dt = new Date(b.scheduledTime);
        const hh = String(dt.getHours()).padStart(2, "0");
        const mm = String(dt.getMinutes()).padStart(2, "0");
        return `${hh}:${mm}`;
      }),
    );

    const finalSlots = allowOverbooking
      ? rawSlots
      : rawSlots.filter((s) => !takenSlots.has(s));

    // "Hoje" em horário local
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(now.getDate()).padStart(2, "0")}`;

    if (date === today) {
      const cutoff = now.getHours() * 60 + now.getMinutes();
      return finalSlots.filter((s) => SchedulingEngine.toMinutes(s) > cutoff);
    }

    return finalSlots;
  }

  static toMinutes(hhmm: string) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  }

  static toHHMM(total: number) {
    const h = String(Math.floor(total / 60)).padStart(2, "0");
    const m = String(total % 60).padStart(2, "0");
    return `${h}:${m}`;
  }
}
