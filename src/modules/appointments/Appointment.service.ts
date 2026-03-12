/* src/modules/appointments/Appointment.service.ts */

import { AppointmentRepository } from "./Appointment.repository";
import { PeopleRepository } from "@/modules/people/People.repository";
import { ProfessionalRepository } from "@/modules/professionals/Professional.repository";

import { acquireLock, releaseLock } from "@/lib/locks";
import { uuidToBigint } from "@/lib/hash";
import { outboxInsert } from "@/modules/outbox/outbox.repository";
import { validateSchedulingRules } from "@/modules/schedules/Schedule.model";
import { formatPtBr } from "@/lib/time";
import { getDb } from "@/lib/db";

import type {
  AppointmentCancelledPayload,
  AppointmentCreatedPayload,
  AppointmentRescheduledPayload,
} from "@/domain/events/outbox-contracts";

type AppointmentListFilters = {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  professionalId?: string;
  status?: string;
  companyId?: string;
};

type AppointmentCreateResult =
  | { ok: true; appointment: any }
  | { ok: false; error: string; message: string };

function isUniqueActiveSlotError(err: unknown) {
  const e = err as any;

  // Postgres unique_violation
  if (e?.code !== "23505") return false;

  // Nome do índice que você já criou no Supabase
  if (e?.constraint === "appointments_unique_active_slot") return true;

  // Fallback por mensagem (drivers variam)
  const msg = String(e?.message ?? "");
  return msg.includes("appointments_unique_active_slot");
}

export class AppointmentService {
  static async list(filters: AppointmentListFilters = {}) {
    return AppointmentRepository.list(filters);
  }

  static async get(id: string) {
    return AppointmentRepository.findById(id);
  }

  static async getDetailed(id: string) {
    return AppointmentRepository.findDetailedById(id);
  }

  static async create(data: {
    professionalId: string;
    clientId: string;
    scheduledTime: string;
  }): Promise<AppointmentCreateResult> {
    const { professionalId, clientId, scheduledTime } = data;

    if (!professionalId || !clientId || !scheduledTime) {
      return {
        ok: false,
        error: "missing_fields",
        message: "Campos obrigatórios ausentes.",
      };
    }

    const professional = await ProfessionalRepository.findById(professionalId);
    if (!professional) {
      return {
        ok: false,
        error: "invalid_professional",
        message: "Profissional não encontrado.",
      };
    }

    const client = await PeopleRepository.findById(clientId);
    if (!client) {
      return {
        ok: false,
        error: "invalid_client",
        message: "Cliente não encontrado.",
      };
    }

    // ✅ companyId CANÔNICO (string)
    const companyId = (professional as any).companyId ?? null;
    if (!companyId) {
      return {
        ok: false,
        error: "missing_company",
        message: "Profissional sem companyId. Não é possível validar regras.",
      };
    }

    const validated = await validateSchedulingRules({
      companyId, // ✅ string garantida
      professionalId,
      scheduledTimeUtcIso: scheduledTime,
    });

    if (!validated.ok) {
      return {
        ok: false,
        error: validated.error,
        message: validated.message ?? "Horário não permitido.",
      };
    }

    const phoneE164 =
      (client as any).phoneE164 ??
      (client as any).phone_e164 ??
      (client as any).phoneE164?.toString?.();

    if (!phoneE164) {
      return {
        ok: false,
        error: "missing_phone",
        message: "Cliente sem phoneE164. Não é possível notificar.",
      };
    }

    const db = getDb();

    const txResult = await db.transaction(async (tx: any) => {
      let appt: any;

      try {
        // ✅ IMPORTANTE: grava companyId na appointment (evita appt.companyId null)
        appt = await AppointmentRepository.createTx(tx, {
          companyId,
          professionalId,
          clientId,
          scheduledTime: new Date(scheduledTime),
          status: "CONFIRMED",
        });
      } catch (err) {
        if (isUniqueActiveSlotError(err)) {
          return {
            ok: false as const,
            error: "slot_taken",
            message: "Horário já reservado.",
          };
        }
        throw err;
      }

      // ✅ Mesmo assim, guard defensivo
      if (!appt?.id) {
        throw new Error("failed_to_create_appointment");
      }

      const payload: AppointmentCreatedPayload = {
        companyId, // ✅ usa o companyId garantido, não appt.companyId
        appointment: {
          id: appt.id,
          scheduledTime: appt.scheduledTime,
          status: appt.status ?? null,
        },
        client: {
          id: (client as any).id ?? clientId,
          name: (client as any).name ?? null,
          phoneE164,
          email: (client as any).email ?? null,
        },
        professional: {
          id: (professional as any).id ?? professionalId,
          name: (professional as any).name ?? null,
          specialty: (professional as any).specialty ?? null,
        },
        meta: { source: "vscode", emittedAt: new Date().toISOString() },
      };

      await outboxInsert(
        {
          aggregateType: "appointment",
          aggregateId: appt.id,
          eventType: "appointment.created",
          payload,
        },
        tx,
      );

      return { ok: true as const, appointment: appt };
    });

    return txResult as AppointmentCreateResult;
  }

  static async update(id: string, data: any) {
    return AppointmentRepository.update(id, data);
  }

  static async remove(id: string) {
    return AppointmentRepository.delete(id);
  }

  static async cancel(id: string) {
    const key = uuidToBigint(id);
    await acquireLock(key);

    try {
      const appt = await AppointmentRepository.findById(id);

      if (!appt) {
        return {
          ok: false,
          error: "not_found",
          message: "Agendamento não encontrado.",
        };
      }

      if (appt.status === "CANCELLED") {
        return { ok: true, appointment: appt };
      }

      // ✅ companyId string garantida (sem `!`)
      const companyId = (appt as any).companyId ?? null;
      if (!companyId) {
        return {
          ok: false as const,
          error: "missing_company",
          message: "Agendamento sem companyId. Não é possível emitir evento.",
        };
      }

      const db = getDb();

      const txResult = await db.transaction(async (tx: any) => {
        const updated = await AppointmentRepository.updateTx(tx, id, {
          status: "CANCELLED",
        });

        const payload: AppointmentCancelledPayload = {
          companyId, // ✅ string
          appointmentId: id,
          cancelledAt: new Date().toISOString(),
          previousStatus: appt.status ?? null,
          meta: { source: "vscode", emittedAt: new Date().toISOString() },
        };

        await outboxInsert(
          {
            aggregateType: "appointment",
            aggregateId: id,
            eventType: "appointment.cancelled",
            payload,
          },
          tx,
        );

        return { ok: true as const, appointment: updated };
      });

      return txResult;
    } finally {
      await releaseLock(key);
    }
  }

  static async reschedule(id: string, newTime: string) {
    const key = uuidToBigint(id);
    await acquireLock(key);

    try {
      const appt = await AppointmentRepository.findById(id);

      if (!appt) {
        return {
          ok: false as const,
          error: "not_found",
          message: "Agendamento não encontrado.",
        };
      }

      if (!appt.professionalId) {
        return {
          ok: false as const,
          error: "invalid_professional",
          message: "Agendamento sem profissional associado.",
        };
      }

      // ✅ FIX DO SEU ERRO: companyId vira string garantida aqui
      const companyId = (appt as any).companyId ?? null;
      if (!companyId) {
        return {
          ok: false as const,
          error: "missing_company",
          message: "Agendamento sem companyId. Não é possível reagendar.",
        };
      }

      const validated = await validateSchedulingRules({
        companyId, // ✅ string
        professionalId: appt.professionalId,
        scheduledTimeUtcIso: newTime,
        appointmentIdToIgnore: id,
      });

      if (!validated.ok) {
        return {
          ok: false as const,
          error: validated.error,
          message: validated.message ?? "Horário não permitido.",
        };
      }

      const db = getDb();

      const txResult = await db.transaction(async (tx: any) => {
        let updated: any;

        try {
          updated = await AppointmentRepository.updateTx(tx, id, {
            scheduledTime: new Date(newTime),
          });
        } catch (err) {
          if (isUniqueActiveSlotError(err)) {
            return {
              ok: false as const,
              error: "slot_taken",
              message: "Horário já reservado.",
            };
          }
          throw err;
        }

        const payload: AppointmentRescheduledPayload = {
          companyId, // ✅ string (corrige TS2322)
          appointmentId: id,
          from: appt.scheduledTime,
          to: newTime,
          meta: { source: "vscode", emittedAt: new Date().toISOString() },
        };

        await outboxInsert(
          {
            aggregateType: "appointment",
            aggregateId: id,
            eventType: "appointment.rescheduled",
            payload,
          },
          tx,
        );

        return { ok: true as const, appointment: updated };
      });

      return txResult;
    } finally {
      await releaseLock(key);
    }
  }

  static async cancelNextForClient(params: {
    companyId: string;
    clientId: string;
    minAdvanceMinutes?: number;
    now?: Date;
  }) {
    const { companyId, clientId } = params;

    if (!companyId || !clientId) {
      return {
        ok: false as const,
        error: "missing_fields",
        message: "companyId e clientId são obrigatórios.",
      };
    }

    const now = params.now ?? new Date();

    const lockKey = uuidToBigint(clientId);
    await acquireLock(lockKey);

    try {
      const next = await AppointmentRepository.findNextActiveByClient({
        companyId,
        clientId,
        now,
      });

      if (!next) {
        return {
          ok: false as const,
          error: "no_upcoming_appointment",
          message: "Nenhum agendamento futuro encontrado para cancelar.",
        };
      }

      return await AppointmentService.cancelByIdForClient({
        companyId,
        clientId,
        appointmentId: (next as any).id,
        minAdvanceMinutes: params.minAdvanceMinutes ?? 0,
        now,
      });
    } finally {
      await releaseLock(lockKey);
    }
  }

  static async cancelByIdForClient(params: {
    companyId: string;
    clientId: string;
    appointmentId: string;
    minAdvanceMinutes?: number;
    now?: Date;
  }) {
    const { companyId, clientId, appointmentId } = params;

    if (!companyId || !clientId || !appointmentId) {
      return {
        ok: false as const,
        error: "missing_fields",
        message: "companyId, clientId e appointmentId são obrigatórios.",
      };
    }

    const now = params.now ?? new Date();

    const lockKey = uuidToBigint(`${companyId}:${clientId}`);
    await acquireLock(lockKey);

    try {
      const appt = await AppointmentRepository.findByIdScoped({
        companyId,
        appointmentId,
      });

      if (!appt) {
        return {
          ok: false as const,
          error: "not_found",
          message: "Agendamento não encontrado.",
        };
      }

      if ((appt as any).clientId !== clientId) {
        return {
          ok: false as const,
          error: "forbidden",
          message: "Este agendamento não pertence a este cliente.",
        };
      }

      if ((appt as any).status === "CANCELLED") {
        return {
          ok: true as const,
          appointmentId: (appt as any).id,
          scheduledTimeUtc: (appt as any).scheduledTime,
          replyText: `✅ Agendamento já estava cancelado.\n📅 ${formatPtBr(
            String((appt as any).scheduledTime),
          )}`,
        };
      }

      const minAdvance = params.minAdvanceMinutes ?? 0;
      const scheduled = new Date((appt as any).scheduledTime);
      const diffMinutes = Math.floor(
        (scheduled.getTime() - now.getTime()) / 60_000,
      );

      if (diffMinutes < 0) {
        return {
          ok: false as const,
          error: "appointment_in_past",
          message: "Esse agendamento já passou e não pode ser cancelado.",
        };
      }

      if (diffMinutes < minAdvance) {
        return {
          ok: false as const,
          error: "too_late_to_cancel",
          message:
            minAdvance > 0
              ? `Para cancelar, é necessário pelo menos ${minAdvance} minutos de antecedência.`
              : "Não é possível cancelar este agendamento.",
        };
      }

      const db = getDb();

      const txResult = await db.transaction(async (tx: any) => {
        const cancelled = await AppointmentRepository.updateTx(
          tx,
          (appt as any).id,
          {
            status: "CANCELLED",
            updatedAt: new Date(),
          },
        );

        const payload: AppointmentCancelledPayload = {
          companyId,
          appointmentId: (cancelled as any).id,
          cancelledAt: now.toISOString(),
          previousStatus: (appt as any).status ?? null,
          meta: { source: "api", emittedAt: now.toISOString() },
        };

        await outboxInsert(
          {
            aggregateType: "appointment",
            aggregateId: (cancelled as any).id,
            eventType: "appointment.cancelled",
            payload,
          },
          tx,
        );

        return {
          ok: true as const,
          appointmentId: (cancelled as any).id,
          scheduledTimeUtc: (cancelled as any).scheduledTime,
          replyText: `✅ Agendamento cancelado.\n📅 ${formatPtBr(
            String((cancelled as any).scheduledTime),
          )}`,
        };
      });

      return txResult;
    } finally {
      await releaseLock(lockKey);
    }
  }
}
