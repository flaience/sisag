// src/modules/scheduling/scheduling-engine.ts
import { db } from "@/lib/db";
import {
  schedulingConfig,
  appointments,
  professionalSchedules,
} from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function validateSchedulingRules(
  professionalId: string,
  isoTime: string
): Promise<ValidationResult> {
  const dt = new Date(isoTime);
  const today = new Date();
  const todayDateOnly = new Date(today.toISOString().substring(0, 10)); // midnight today

  // proibido passado
  if (dt < todayDateOnly) {
    return {
      ok: false,
      error: "invalid_past",
      message: "Não é possível agendar no passado.",
    };
  }

  const cfgRow = (await db.select().from(schedulingConfig).limit(1))[0];
  if (!cfgRow) {
    return {
      ok: false,
      error: "no_config",
      message: "Configuração de agendamento não encontrada.",
    };
  }

  const cfg = cfgRow as any;
  const diffDays = Math.floor(
    (dt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays > cfg.maxAdvanceDays) {
    return {
      ok: false,
      error: "max_days",
      message: `Agendamentos com mais de ${cfg.maxAdvanceDays} dias de antecedência não são permitidos.`,
    };
  }

  // verificar disponibilidade do profissional no dia
  const weekday = dt.getDay();

  const schedules = await db
    .select()
    .from(professionalSchedules)
    .where(
      and(
        eq(professionalSchedules.weekday, weekday),
        eq(professionalSchedules.professionalId, professionalId)
      )
    );

  if (!schedules.length) {
    return {
      ok: false,
      error: "no_schedule",
      message: "Profissional não tem disponibilidade neste dia.",
    };
  }

  const hhmm = isoTime.substring(11, 16);

  let allowed = false;
  for (const sch of schedules) {
    if (hhmm >= sch.startTime && hhmm < sch.endTime) {
      allowed = true;
      break;
    }
  }

  if (!allowed) {
    return {
      ok: false,
      error: "out_of_range",
      message: "Horário fora do período de atendimento do profissional.",
    };
  }

  // conflito
  const existing = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.professionalId, professionalId),
        eq(appointments.scheduledTime, new Date(isoTime))
      )
    );

  if (existing.length && !cfg.allowOverbooking) {
    return { ok: false, error: "slot_taken", message: "Horário já reservado." };
  }

  return { ok: true };
}
