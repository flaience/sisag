/* src/modules/appointments/Appointment.service.ts */

import { AppointmentRepository } from "./Appointment.repository";
import { PeopleRepository } from "@/modules/people/People.repository";
import { ProfessionalRepository } from "@/modules/professionals/Professional.repository";

import { acquireLock, releaseLock } from "@/lib/locks";
import { uuidToBigint } from "@/lib/hash";
import { outboxInsert } from "@/modules/outbox/outbox.repository";
import { validateSchedulingRules } from "@/modules/scheduling/scheduling-engine";

export class AppointmentService {
  // -------------------------------------------------------
  // LISTAGEM
  // -------------------------------------------------------
  static async list(filters: any = {}) {
    return AppointmentRepository.list(filters);
  }

  // -------------------------------------------------------
  // GET POR ID
  // -------------------------------------------------------
  static async get(id: string) {
    return AppointmentRepository.findById(id);
  }

  // -------------------------------------------------------
  // CREATE — COMPLETO E PADRONIZADO
  // -------------------------------------------------------
  static async create(data: {
    professionalId: string;
    clientId: string;
    scheduledTime: string;
  }) {
    const { professionalId, clientId, scheduledTime } = data;

    // ------------------------------
    // 1. validar dados básicos
    // ------------------------------
    if (!professionalId || !clientId || !scheduledTime) {
      return {
        ok: false,
        error: "missing_fields",
        message: "Campos obrigatórios ausentes.",
      };
    }

    // ------------------------------
    // 2. validar profissional
    // ------------------------------
    const professional = await ProfessionalRepository.findById(professionalId);

    if (!professional) {
      return {
        ok: false,
        error: "invalid_professional",
        message: "Profissional não encontrado.",
      };
    }

    // ------------------------------
    // 3. validar cliente
    // ------------------------------
    const client = await PeopleRepository.findById(clientId);

    if (!client) {
      return {
        ok: false,
        error: "invalid_client",
        message: "Cliente não encontrado.",
      };
    }

    // ------------------------------
    // 4. validar regras de agendamento
    // ------------------------------
    const validated = await validateSchedulingRules(
      professionalId,
      scheduledTime
    );

    if (!validated.ok) {
      return {
        ok: false,
        error: validated.error,
        message: validated.message ?? "Horário não permitido.",
      };
    }

    // ------------------------------
    // 5. criar agendamento
    // ------------------------------
    const appt = await AppointmentRepository.create({
      professionalId,
      clientId,
      scheduledTime: new Date(scheduledTime),
      status: "CONFIRMED",
    });

    // ------------------------------
    // 6. enviar evento para OUTBOX
    // ------------------------------
    await outboxInsert({
      aggregateType: "appointment",
      aggregateId: appt.id,
      eventType: "APPOINTMENT_CREATED",
      payload: appt,
    });

    return { ok: true, appointment: appt };
  }

  // -------------------------------------------------------
  // UPDATE SIMPLES
  // -------------------------------------------------------
  static async update(id: string, data: any) {
    return AppointmentRepository.update(id, data);
  }

  // -------------------------------------------------------
  // DELETE / REMOVE
  // -------------------------------------------------------
  static async remove(id: string) {
    return AppointmentRepository.delete(id);
  }

  // -------------------------------------------------------
  // CANCELAMENTO SEGURO
  // -------------------------------------------------------
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
        return { ok: true, appointment: appt }; // idempotente
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
        },
      });

      return { ok: true, appointment: updated };
    } finally {
      await releaseLock(key);
    }
  }

  // -------------------------------------------------------
  // REAGENDAMENTO SEGURO
  // -------------------------------------------------------
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

      // validar regras novamente
      const validated = await validateSchedulingRules(
        appt.professionalId,
        newTime
      );

      if (!validated.ok) {
        return {
          ok: false,
          error: validated.error,
          message: validated.message ?? "Horário não permitido.",
        };
      }

      // atualizar slot
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
        },
      });

      return { ok: true, appointment: updated };
    } finally {
      await releaseLock(key);
    }
  }
}
