/* src/modules/appointments/Appointment.service.ts */

import { AppointmentRepository } from "./Appointment.repository";
import { PeopleRepository } from "@/modules/people/People.repository";
import { ProfessionalRepository } from "@/modules/professionals/Professional.repository";

import { acquireLock, releaseLock } from "@/lib/locks";
import { uuidToBigint } from "@/lib/hash";
import { outboxInsert } from "@/modules/outbox/outbox.repository";
import { validateSchedulingRules } from "@/modules/scheduling/scheduling-engine";

import type {
  AppointmentCancelledPayload,
  AppointmentCreatedPayload,
  AppointmentRescheduledPayload,
} from "@/domain/events/outbox-contracts";

type AppointmentCreateResult =
  | { ok: true; appointment: any }
  | { ok: false; error: string; message: string };

export class AppointmentService {
  static async list(filters: any = {}) {
    return AppointmentRepository.list(filters);
  }

  static async get(id: string) {
    return AppointmentRepository.findById(id);
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

    const validated = await validateSchedulingRules(
      professionalId,
      scheduledTime,
    );
    if (!validated.ok) {
      return {
        ok: false,
        error: validated.error,
        message: validated.message ?? "Horário não permitido.",
      };
    }

    const appt = await AppointmentRepository.create({
      professionalId,
      clientId,
      scheduledTime: new Date(scheduledTime),
      status: "CONFIRMED",
    });

    // 🔒 GUARDA (produção): sem companyId e sem phoneE164, não há como notificar.
    if (!appt.companyId) {
      return {
        ok: false,
        error: "missing_company",
        message: "Agendamento sem companyId. Não é possível emitir evento.",
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

    // ✅ OUTBOX: payload tipado (contrato congelado)
    const payload: AppointmentCreatedPayload = {
      companyId: appt.companyId,

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

      meta: {
        source: "vscode",
        emittedAt: new Date().toISOString(),
      },
    };

    await outboxInsert({
      aggregateType: "appointment",
      aggregateId: appt.id,
      eventType: "appointment.created", // ✅ CANÔNICO
      payload,
    });

    return { ok: true, appointment: appt };
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

      const updated = await AppointmentRepository.update(id, {
        status: "CANCELLED",
      });

      if (!appt.companyId) {
        return {
          ok: false,
          error: "missing_company",
          message: "Agendamento sem companyId. Não é possível emitir evento.",
        };
      }

      const payload: AppointmentCancelledPayload = {
        companyId: appt.companyId,
        appointmentId: id,
        cancelledAt: new Date().toISOString(),
        previousStatus: appt.status ?? null,
        meta: { source: "vscode", emittedAt: new Date().toISOString() },
      };

      await outboxInsert({
        aggregateType: "appointment",
        aggregateId: id,
        eventType: "appointment.cancelled",
        payload,
      });

      return { ok: true, appointment: updated };
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

      const validated = await validateSchedulingRules(
        appt.professionalId,
        newTime,
      );
      if (!validated.ok) {
        return {
          ok: false as const,
          error: validated.error,
          message: validated.message ?? "Horário não permitido.",
        };
      }

      const updated = await AppointmentRepository.update(id, {
        scheduledTime: new Date(newTime),
      });

      if (!appt.companyId) {
        return {
          ok: false as const,
          error: "missing_company",
          message: "Agendamento sem companyId. Não é possível emitir evento.",
        };
      }

      const payload: AppointmentRescheduledPayload = {
        companyId: appt.companyId,
        appointmentId: id,
        from: appt.scheduledTime,
        to: newTime,
        meta: { source: "vscode", emittedAt: new Date().toISOString() },
      };

      await outboxInsert({
        aggregateType: "appointment",
        aggregateId: id,
        eventType: "appointment.rescheduled",
        payload,
      });

      return { ok: true, appointment: updated };
    } finally {
      await releaseLock(key);
    }
  }
}
