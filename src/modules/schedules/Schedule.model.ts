// src/modules/schedules/Schedule.model.ts
import { ScheduleRepository } from "./Schedule.repository";

export type Schedule = {
  id: string;
  professionalId: string;
  weekday: number; // 0-6
  startTime: string; // "08:00"
  endTime: string; // "12:00"
  createdAt: Date;
};

type ValidateSchedulingInput = {
  companyId: string;
  professionalId: string;
  scheduledTimeUtcIso: string; // ISO UTC (timestamptz)
  appointmentIdToIgnore?: string | null; // p/ reschedule
  now?: Date; // p/ testes
};

type ValidateResult =
  | { ok: true }
  | { ok: false; error: string; message: string };

export async function validateSchedulingRules(
  input: ValidateSchedulingInput,
): Promise<ValidateResult> {
  const { companyId, professionalId, scheduledTimeUtcIso } = input;

  if (!companyId || !professionalId || !scheduledTimeUtcIso) {
    return {
      ok: false,
      error: "missing_fields",
      message:
        "companyId, professionalId e scheduledTimeUtcIso são obrigatórios.",
    };
  }

  const now = input.now ?? new Date();
  const scheduled = new Date(scheduledTimeUtcIso);

  if (Number.isNaN(scheduled.getTime())) {
    return {
      ok: false,
      error: "invalid_datetime",
      message: "Data/hora inválida.",
    };
  }

  // não agenda no passado
  if (scheduled.getTime() <= now.getTime()) {
    return {
      ok: false,
      error: "past_datetime",
      message: "Não é possível agendar para uma data/hora que já passou.",
    };
  }

  const cfg = await ScheduleRepository.getConfig(companyId);

  // antecedência máxima (dias)
  if (cfg.maxAdvanceDays > 0) {
    const maxAdvanceMs = cfg.maxAdvanceDays * 24 * 60 * 60 * 1000;
    if (scheduled.getTime() > now.getTime() + maxAdvanceMs) {
      return {
        ok: false,
        error: "too_far_in_future",
        message: `Este agendamento excede a antecedência máxima de ${cfg.maxAdvanceDays} dias.`,
      };
    }
  }

  // antecedência mínima (bufferMinutes) - opcional mas útil
  if (cfg.bufferMinutes > 0) {
    const minMs = cfg.bufferMinutes * 60 * 1000;
    if (scheduled.getTime() < now.getTime() + minMs) {
      return {
        ok: false,
        error: "too_soon",
        message: `Este agendamento precisa ter pelo menos ${cfg.bufferMinutes} minutos de antecedência.`,
      };
    }
  }

  // conflito de horário
  if (!cfg.allowOverbooking) {
    const conflict = await ScheduleRepository.hasConflict({
      companyId,
      professionalId,
      scheduled,
      slotDurationMinutes: cfg.slotDurationMinutes,
      bufferMinutes: cfg.bufferMinutes,
      appointmentIdToIgnore: input.appointmentIdToIgnore ?? null,
    });

    if (conflict) {
      return {
        ok: false,
        error: "slot_unavailable",
        message: "Este horário não está disponível.",
      };
    }
  }

  return { ok: true };
}
