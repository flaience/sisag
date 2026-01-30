/* src/modules/appointments/Appointment.service.ts */

import { AppointmentRepository } from "./Appointment.repository";
import { PeopleRepository } from "@/modules/people/People.repository";
import { ProfessionalRepository } from "@/modules/professionals/Professional.repository";

import { acquireLock, releaseLock } from "@/lib/locks";
import { uuidToBigint } from "@/lib/hash";
import { outboxInsert } from "@/modules/outbox/outbox.repository";
import { validateSchedulingRules } from "@/modules/scheduling/scheduling-engine";

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
  }) {
    const { professionalId, clientId, scheduledTime } = data;

    // 1) validar dados básicos
    if (!professionalId || !clientId || !scheduledTime) {
      return {
        ok: false,
        error: "missing_fields",
        message: "Campos obrigatórios ausentes.",
      };
    }

    // 2) validar profissional
    const professional = await ProfessionalRepository.findById(professionalId);
    if (!professional) {
      return {
        ok: false,
        error: "invalid_professional",
        message: "Profissional não encontrado.",
      };
    }

    // 3) validar cliente
    const client = await PeopleRepository.findById(clientId);
    if (!client) {
      return {
        ok: false,
        error: "invalid_client",
        message: "Cliente não encontrado.",
      };
    }

    // 4) validar regras de agendamento
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

    // 5) criar agendamento
    const appt = await AppointmentRepository.create({
      professionalId,
      clientId,
      scheduledTime: new Date(scheduledTime),
      status: "CONFIRMED",
    });

    // 6) enviar evento para OUTBOX (payload rico p/ n8n/WhatsApp)
    await outboxInsert({
      aggregateType: "appointment",
      aggregateId: appt.id,
      eventType: "APPOINTMENT_CREATED",
      payload: {
        appointment: {
          id: appt.id,
          scheduledTime: appt.scheduledTime,
          status: appt.status,
          professionalId: appt.professionalId,
          clientId: appt.clientId,
          confirmedAt: (appt as any).confirmedAt ?? null,
          createdAt: (appt as any).createdAt ?? null,
        },
        client: {
          id: (client as any).id ?? clientId,
          name: (client as any).name ?? null,
          phone: (client as any).phone ?? (client as any).whatsapp ?? null,
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
      },
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

      await outboxInsert({
        aggregateType: "appointment",
        aggregateId: id,
        eventType: "APPOINTMENT_CANCELLED",
        payload: {
          appointmentId: id,
          cancelledAt: new Date().toISOString(),
          previousStatus: appt.status,
          meta: { source: "vscode", emittedAt: new Date().toISOString() },
        },
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
          ok: false,
          error: "not_found",
          message: "Agendamento não encontrado.",
        };
      }

      if (!appt.professionalId) {
        return {
          ok: false,
          error: "invalid_professional",
          message: "Profissional inválido.",
        };
      }

      const validated = await validateSchedulingRules(
        appt.professionalId,
        newTime,
      );
      if (!validated.ok) {
        return {
          ok: false,
          error: validated.error,
          message: validated.message ?? "Horário não permitido.",
        };
      }

      const updated = await AppointmentRepository.update(id, {
        scheduledTime: new Date(newTime),
      });

      await outboxInsert({
        aggregateType: "appointment",
        aggregateId: id,
        eventType: "APPOINTMENT_RESCHEDULED",
        payload: {
          appointmentId: id,
          from: appt.scheduledTime,
          to: newTime,
          meta: { source: "vscode", emittedAt: new Date().toISOString() },
        },
      });

      return { ok: true, appointment: updated };
    } finally {
      await releaseLock(key);
    }
  }
}
