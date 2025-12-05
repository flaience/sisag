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

import { db } from "@/lib/db";
import {
  professionalSchedules,
  appointments,
  schedulingConfig,
} from "@/drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export class SchedulingEngine {
  /**
   * Método principal:
   *   getAvailableSlots(professionalId, "2025-12-30")
   *
   * Retorna: ["08:00", "08:20", "08:40", ...]
   */
  static async getAvailableSlots(professionalId: string, date: string) {
    // --------------------------
    // 1. Buscar config global
    // --------------------------
    const [config] = await db.select().from(schedulingConfig).limit(1);
    const slotDuration = config?.slotDurationMinutes ?? 20;
    const bufferMinutes = config?.bufferMinutes ?? 5;
    const allowOverbooking = config?.allowOverbooking ?? false;

    // --------------------------
    // 2. Determinar dia da semana
    // --------------------------
    const weekday = new Date(date + "T00:00:00").getDay();

    // --------------------------
    // 3. Buscar horários fixos do profissional
    // --------------------------
    const schedules = await db
      .select()
      .from(professionalSchedules)
      .where(
        and(
          eq(professionalSchedules.professionalId, professionalId),
          eq(professionalSchedules.weekday, weekday)
        )
      );

    if (schedules.length === 0) return [];

    // --------------------------
    // 4. Gerar slots crus
    // --------------------------
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

    // --------------------------
    // 5. Buscar agendamentos já existentes no dia
    // --------------------------
    const startDay = new Date(date + "T00:00:00.000Z");
    const endDay = new Date(date + "T23:59:59.999Z");

    const booked = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.professionalId, professionalId),
          gte(appointments.scheduledTime, startDay),
          lte(appointments.scheduledTime, endDay)
        )
      );

    const takenSlots = new Set(
      booked.map((b) => {
        const dt = new Date(b.scheduledTime);
        return dt.toISOString().substring(11, 16); // "HH:MM"
      })
    );

    // --------------------------
    // 6. Filtrar conflitos (se não permitir overbooking)
    // --------------------------
    const finalSlots = allowOverbooking
      ? rawSlots
      : rawSlots.filter((s) => !takenSlots.has(s));

    // --------------------------
    // 7. Remover horários passados (se for hoje)
    // --------------------------
    const today = new Date().toISOString().substring(0, 10);
    if (date === today) {
      const now = new Date();
      const cutoff = now.getHours() * 60 + now.getMinutes();
      return finalSlots.filter((s) => {
        const m = SchedulingEngine.toMinutes(s);
        return m > cutoff;
      });
    }

    return finalSlots;
  }

  // Helpers ---------------------------------------------------------

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
