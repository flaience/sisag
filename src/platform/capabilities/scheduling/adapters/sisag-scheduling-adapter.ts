// src/platform/capabilities/scheduling/adapters/sisag-scheduling-adapter.ts
import type {
  AppointmentSummary,
  AvailableSlot,
  CancelAppointmentInput,
  CompleteAppointmentInput,
  ConfirmAppointmentInput,
  CreateAppointmentInput,
  FindAvailableSlotsInput,
  RescheduleAppointmentInput,
  SchedulingAppointmentState,
  SchedulingOperationContext,
  SchedulingOperationResult,
  SchedulingOperationsPort,
} from "../index";
import { and, eq } from "drizzle-orm";
import { BookingCoreService } from "@/modules/bookings/Booking.core";
import {
  bookingItemAllocations,
  bookingItems,
  bookings,
  professionals,
  services,
} from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { AvailabilityService } from "@/modules/availability/Availability.service";

export class SisagSchedulingAdapter implements SchedulingOperationsPort {
  async findAvailableSlots(
    context: SchedulingOperationContext,
    input: FindAvailableSlotsInput,
  ): Promise<SchedulingOperationResult<AvailableSlot[]>> {
    try {
      const dateFrom = new Date(input.dateFrom);
      const dateTo = new Date(input.dateTo);

      if (
        Number.isNaN(dateFrom.getTime()) ||
        Number.isNaN(dateTo.getTime()) ||
        dateTo <= dateFrom
      ) {
        return {
          ok: false,
          error: {
            code: "SCHEDULING_OPERATION_NOT_ALLOWED",
            message:
              "O intervalo informado para consulta de disponibilidade é inválido.",
          },
        };
      }

      let resourceId = input.resourceId?.trim() || undefined;
      let professionalCompanyId: string | null = null;

      if (input.professionalId) {
        const db = getDb();

        const rows = await db
          .select({
            resourceId: professionals.resourceId,
            companyId: professionals.companyId,
          })
          .from(professionals)
          .where(eq(professionals.id, input.professionalId))
          .limit(1);

        const professional = rows[0];

        if (!professional) {
          return {
            ok: false,
            error: {
              code: "SCHEDULING_PROFESSIONAL_NOT_FOUND",
              message: "O profissional informado não foi encontrado.",
            },
          };
        }

        professionalCompanyId = professional.companyId ?? null;

        if (
          professionalCompanyId &&
          professionalCompanyId !== context.companyId
        ) {
          return {
            ok: false,
            error: {
              code: "SCHEDULING_OPERATION_NOT_ALLOWED",
              message:
                "O profissional informado não pertence ao contexto operacional atual.",
            },
          };
        }

        if (!resourceId) {
          resourceId = professional.resourceId ?? undefined;
        }
      }

      if (!input.serviceId && !resourceId) {
        return {
          ok: false,
          error: {
            code: "SCHEDULING_RESOURCE_NOT_FOUND",
            message:
              "Informe um serviço ou um recurso para calcular a disponibilidade.",
          },
        };
      }

      if (
        !input.serviceId &&
        (!input.durationMinutes || input.durationMinutes <= 0)
      ) {
        return {
          ok: false,
          error: {
            code: "SCHEDULING_OPERATION_NOT_ALLOWED",
            message:
              "A duração é obrigatória quando a disponibilidade não está vinculada a um serviço.",
          },
        };
      }

      const stepMinutes =
        input.stepMinutes !== undefined &&
        Number.isFinite(input.stepMinutes) &&
        input.stepMinutes > 0
          ? input.stepMinutes
          : 15;

      const requestedLimit =
        input.limit !== undefined &&
        Number.isFinite(input.limit) &&
        input.limit > 0
          ? input.limit
          : 200;

      const intervalMinutes = Math.ceil(
        (dateTo.getTime() - dateFrom.getTime()) / 60_000,
      );

      const intervalLimit = Math.max(
        1,
        Math.ceil(intervalMinutes / stepMinutes),
      );

      const limit = Math.min(2_000, requestedLimit, intervalLimit);

      const result = await AvailabilityService.listSlots({
        companyId: context.companyId,
        serviceId: input.serviceId ?? undefined,
        resourceId,
        startTime: dateFrom,
        durationMinutes: input.durationMinutes ?? undefined,
        limit,
        stepMinutes,
      });
      if (result.ok === false) {
        const errorCode = (() => {
          switch (result.error) {
            case "resource_not_found":
              return "SCHEDULING_RESOURCE_NOT_FOUND";

            case "no_capacity":
            case "service_has_no_requirements":
            case "service_or_duration_required":
              return "SCHEDULING_AVAILABILITY_NOT_FOUND";

            case "company_id_required":
            case "invalid_start_time":
              return "SCHEDULING_OPERATION_NOT_ALLOWED";

            case "internal_error":
            default:
              return "SCHEDULING_UNKNOWN_ERROR";
          }
        })();

        return {
          ok: false,
          error: {
            code: errorCode,
            message:
              result.message ??
              "Não foi possível calcular a disponibilidade solicitada.",
          },
        };
      }

      const slots: AvailableSlot[] = result.slots
        .filter((slot) => {
          const startsAt = new Date(slot.startTime);

          return (
            !Number.isNaN(startsAt.getTime()) &&
            startsAt >= dateFrom &&
            startsAt < dateTo
          );
        })
        .slice(0, limit)
        .map((slot) => ({
          startsAt: slot.startTime,
          endsAt: slot.endTime,
          professionalId: input.professionalId ?? null,
          resourceIds: slot.resourceIds,
        }));

      return {
        ok: true,
        data: slots,
        emittedEvents: ["availability.generated"],
      };
    } catch (error) {
      console.error(
        "SISAG SCHEDULING ADAPTER FIND AVAILABLE SLOTS ERROR:",
        error,
      );

      return {
        ok: false,
        error: {
          code: "SCHEDULING_UNKNOWN_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Erro inesperado ao calcular a disponibilidade.",
        },
      };
    }
  }

  async createAppointment(
    context: SchedulingOperationContext,
    input: CreateAppointmentInput,
  ): Promise<SchedulingOperationResult<AppointmentSummary>> {
    try {
      const companyId = context.companyId?.trim();
      const clientId = input.clientId?.trim();
      const serviceId = input.serviceId?.trim();
      const professionalId = input.professionalId?.trim() || undefined;

      const startsAt = new Date(input.startsAt);
      const requestedEndsAt = new Date(input.endsAt);

      if (!companyId || !clientId || !serviceId) {
        return {
          ok: false,
          error: {
            code: "SCHEDULING_OPERATION_NOT_ALLOWED",
            message:
              "Empresa, cliente e serviço são obrigatórios para criar o agendamento.",
          },
        };
      }

      if (
        Number.isNaN(startsAt.getTime()) ||
        Number.isNaN(requestedEndsAt.getTime()) ||
        requestedEndsAt <= startsAt
      ) {
        return {
          ok: false,
          error: {
            code: "SCHEDULING_OPERATION_NOT_ALLOWED",
            message: "O intervalo informado para o agendamento é inválido.",
          },
        };
      }

      if (input.resourceIds && input.resourceIds.length > 0) {
        return {
          ok: false,
          error: {
            code: "SCHEDULING_OPERATION_NOT_ALLOWED",
            message:
              "A seleção explícita de recursos ainda não é suportada por esta implementação.",
          },
        };
      }

      const db = getDb();

      const serviceRows = await db
        .select({
          durationMinutes: services.durationMinutes,
        })
        .from(services)
        .where(
          and(eq(services.id, serviceId), eq(services.companyId, companyId)),
        )
        .limit(1);

      const service = serviceRows[0];

      if (!service) {
        return {
          ok: false,
          error: {
            code: "SCHEDULING_SERVICE_NOT_FOUND",
            message:
              "O serviço informado não foi encontrado no contexto operacional atual.",
          },
        };
      }

      const durationMinutes = Number(service.durationMinutes);

      if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
        return {
          ok: false,
          error: {
            code: "SCHEDULING_OPERATION_NOT_ALLOWED",
            message: "O serviço não possui uma duração válida configurada.",
          },
        };
      }

      const expectedEndsAt = new Date(
        startsAt.getTime() + durationMinutes * 60_000,
      );

      if (requestedEndsAt.getTime() !== expectedEndsAt.getTime()) {
        return {
          ok: false,
          error: {
            code: "SCHEDULING_OPERATION_NOT_ALLOWED",
            message:
              "O horário final informado não corresponde à duração configurada para o serviço.",
          },
        };
      }

      const created = await BookingCoreService.createAuto({
        companyId,
        clientId,
        professionalId,
        serviceId,
        startTime: startsAt.toISOString(),
        notes: input.notes ?? undefined,
      });
      if (created.ok === false) {
        switch (created.error) {
          case "service_not_found":
            return {
              ok: false,
              error: {
                code: "SCHEDULING_SERVICE_NOT_FOUND",
                message: "O serviço informado não foi encontrado.",
              },
            };

          case "professional_not_found":
            return {
              ok: false,
              error: {
                code: "SCHEDULING_PROFESSIONAL_NOT_FOUND",
                message: "O profissional informado não foi encontrado.",
              },
            };

          case "professional_has_no_resource":
            return {
              ok: false,
              error: {
                code: "SCHEDULING_RESOURCE_NOT_FOUND",
                message:
                  "O profissional informado não possui um recurso operacional associado.",
              },
            };

          case "resource_not_found":
            return {
              ok: false,
              error: {
                code: "SCHEDULING_RESOURCE_NOT_FOUND",
                message:
                  "Nenhum recurso compatível foi encontrado para o agendamento.",
              },
            };

          case "service_has_no_requirements":
            return {
              ok: false,
              error: {
                code: "SCHEDULING_AVAILABILITY_NOT_FOUND",
                message:
                  "O serviço não possui requisitos operacionais configurados.",
              },
            };

          case "slot_taken":
            return {
              ok: false,
              error: {
                code: "SCHEDULING_SLOT_NOT_AVAILABLE",
                message: "O horário solicitado não está mais disponível.",
              },
            };

          case "professional_not_compatible":
            return {
              ok: false,
              error: {
                code: "SCHEDULING_OPERATION_NOT_ALLOWED",
                message: "O profissional não é compatível com o serviço.",
              },
            };

          case "company_id_required":
          case "client_id_required":
          case "service_id_required":
          case "start_time_required":
          case "invalid_start_time":
            return {
              ok: false,
              error: {
                code: "SCHEDULING_OPERATION_NOT_ALLOWED",
                message:
                  "Os dados informados para criação do agendamento são inválidos.",
              },
            };

          case "internal_error":
          default:
            return {
              ok: false,
              error: {
                code: "SCHEDULING_UNKNOWN_ERROR",
                message: "Não foi possível criar o agendamento.",
              },
            };
        }
      }

      const itemRows = await db
        .select({
          id: bookingItems.id,
          serviceId: bookingItems.serviceId,
          startTime: bookingItems.startTime,
          endTime: bookingItems.endTime,
        })
        .from(bookingItems)
        .where(eq(bookingItems.bookingId, created.booking.id))
        .limit(1);

      const item = itemRows[0];

      if (!item) {
        return {
          ok: false,
          error: {
            code: "SCHEDULING_UNKNOWN_ERROR",
            message:
              "O agendamento foi criado, mas seus dados operacionais não puderam ser carregados.",
          },
        };
      }

      const allocationRows = await db
        .select({
          resourceId: bookingItemAllocations.resourceId,
        })
        .from(bookingItemAllocations)
        .where(eq(bookingItemAllocations.bookingItemId, item.id));

      return {
        ok: true,
        data: {
          id: created.booking.id,
          companyId: created.booking.companyId,
          clientId: created.booking.clientId,
          professionalId: professionalId ?? null,
          serviceId: item.serviceId,
          resourceIds: allocationRows.map(
            (allocation) => allocation.resourceId,
          ),
          startsAt: new Date(item.startTime).toISOString(),
          endsAt: new Date(item.endTime).toISOString(),
          state: "pending",
        },
        emittedEvents: ["appointment.created"],
      };
    } catch (error) {
      console.error(
        "SISAG SCHEDULING ADAPTER CREATE APPOINTMENT ERROR:",
        error,
      );

      return {
        ok: false,
        error: {
          code: "SCHEDULING_UNKNOWN_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Erro inesperado ao criar o agendamento.",
        },
      };
    }
  }

  async confirmAppointment(
    context: SchedulingOperationContext,
    input: ConfirmAppointmentInput,
  ): Promise<SchedulingOperationResult<AppointmentSummary>> {
    try {
      const companyId = context.companyId?.trim();
      const appointmentId = input.appointmentId?.trim();

      if (!companyId || !appointmentId) {
        return {
          ok: false,
          error: {
            code: "SCHEDULING_OPERATION_NOT_ALLOWED",
            message: "Empresa e agendamento são obrigatórios para confirmação.",
          },
        };
      }

      const db = getDb();

      const bookingRows = await db
        .select({
          id: bookings.id,
          companyId: bookings.companyId,
          clientId: bookings.clientId,
          startTime: bookings.startTime,
          status: bookings.status,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.id, appointmentId),
            eq(bookings.companyId, companyId),
          ),
        )
        .limit(1);

      const booking = bookingRows[0];

      if (!booking) {
        return {
          ok: false,
          error: {
            code: "SCHEDULING_APPOINTMENT_NOT_FOUND",
            message:
              "O agendamento informado não foi encontrado no contexto operacional atual.",
          },
        };
      }

      const currentStatus = booking.status?.toUpperCase?.() ?? "";

      if (!["PENDING"].includes(currentStatus)) {
        return {
          ok: false,
          error: {
            code: "SCHEDULING_OPERATION_NOT_ALLOWED",
            message: "Somente agendamentos pendentes podem ser confirmados.",
          },
        };
      }

      const actorMap: Record<string, "admin" | "system" | "whatsapp" | "n8n"> =
        {
          user: "admin",
          agent: "system",
          system: "system",
          api: "system",
        };

      const confirmed = await BookingCoreService.confirmById({
        companyId,
        clientId: booking.clientId,
        bookingId: appointmentId,
        actor: actorMap[context.actor.type] ?? "system",
      });

      if (confirmed.ok === false) {
        if (confirmed.error === "not_found") {
          return {
            ok: false,
            error: {
              code: "SCHEDULING_APPOINTMENT_NOT_FOUND",
              message: "O agendamento informado não foi encontrado.",
            },
          };
        }

        return {
          ok: false,
          error: {
            code: "SCHEDULING_UNKNOWN_ERROR",
            message: "Não foi possível confirmar o agendamento.",
          },
        };
      }

      const itemRows = await db
        .select({
          id: bookingItems.id,
          serviceId: bookingItems.serviceId,
          startTime: bookingItems.startTime,
          endTime: bookingItems.endTime,
        })
        .from(bookingItems)
        .where(eq(bookingItems.bookingId, appointmentId))
        .limit(1);

      const item = itemRows[0];

      if (!item) {
        return {
          ok: false,
          error: {
            code: "SCHEDULING_UNKNOWN_ERROR",
            message:
              "O agendamento foi confirmado, mas seus dados operacionais não puderam ser carregados.",
          },
        };
      }

      const allocationRows = await db
        .select({
          resourceId: bookingItemAllocations.resourceId,
        })
        .from(bookingItemAllocations)
        .where(eq(bookingItemAllocations.bookingItemId, item.id));

      return {
        ok: true,
        data: {
          id: appointmentId,
          companyId: booking.companyId,
          clientId: booking.clientId,
          professionalId: null,
          serviceId: item.serviceId,
          resourceIds: allocationRows.map((a) => a.resourceId),
          startsAt: new Date(item.startTime).toISOString(),
          endsAt: new Date(item.endTime).toISOString(),
          state: "confirmed",
        },
        emittedEvents: ["appointment.confirmed"],
      };
    } catch (error) {
      console.error(
        "SISAG SCHEDULING ADAPTER CONFIRM APPOINTMENT ERROR:",
        error,
      );

      return {
        ok: false,
        error: {
          code: "SCHEDULING_UNKNOWN_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Erro inesperado ao confirmar o agendamento.",
        },
      };
    }
  }

  async cancelAppointment(
    context: SchedulingOperationContext,
    input: CancelAppointmentInput,
  ): Promise<SchedulingOperationResult<AppointmentSummary>> {
    try {
      const companyId = context.companyId?.trim();
      const appointmentId = input.appointmentId?.trim();

      if (!companyId || !appointmentId) {
        return {
          ok: false,
          error: {
            code: "SCHEDULING_OPERATION_NOT_ALLOWED",
            message: "Empresa e agendamento são obrigatórios para cancelamento.",
          },
        };
      }

      const db = getDb();
      const bookingRows = await db
        .select({
          id: bookings.id,
          companyId: bookings.companyId,
          clientId: bookings.clientId,
          status: bookings.status,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.id, appointmentId),
            eq(bookings.companyId, companyId),
          ),
        )
        .limit(1);

      const booking = bookingRows[0];
      if (!booking) {
        return {
          ok: false,
          error: {
            code: "SCHEDULING_APPOINTMENT_NOT_FOUND",
            message:
              "O agendamento informado não foi encontrado no contexto operacional atual.",
          },
        };
      }

      const currentStatus = booking.status?.toUpperCase?.() ?? "";
      if (!["PENDING", "CONFIRMED"].includes(currentStatus)) {
        return {
          ok: false,
          error: {
            code: "SCHEDULING_OPERATION_NOT_ALLOWED",
            message:
              "Somente agendamentos pendentes ou confirmados podem ser cancelados.",
          },
        };
      }

      const itemRows = await db
        .select({
          id: bookingItems.id,
          serviceId: bookingItems.serviceId,
          startTime: bookingItems.startTime,
          endTime: bookingItems.endTime,
        })
        .from(bookingItems)
        .where(eq(bookingItems.bookingId, appointmentId))
        .limit(1);

      const item = itemRows[0];
      if (!item) {
        return {
          ok: false,
          error: {
            code: "SCHEDULING_UNKNOWN_ERROR",
            message:
              "Os dados operacionais do agendamento não puderam ser carregados.",
          },
        };
      }

      const allocationRows = await db
        .select({ resourceId: bookingItemAllocations.resourceId })
        .from(bookingItemAllocations)
        .where(eq(bookingItemAllocations.bookingItemId, item.id));

      const actorMap: Record<string, "admin" | "system" | "whatsapp" | "n8n"> =
        {
          user: "admin",
          agent: "system",
          system: "system",
          api: "system",
        };

      const cancelled = await BookingCoreService.cancelById({
        companyId,
        clientId: booking.clientId,
        bookingId: appointmentId,
        actor: actorMap[context.actor.type] ?? "system",
        reason: input.reason ?? null,
      });

      if (cancelled.ok === false) {
        return {
          ok: false,
          error: {
            code: "SCHEDULING_OPERATION_NOT_ALLOWED",
            message:
              "O agendamento não existe mais ou não pode ser cancelado no estado atual.",
          },
        };
      }

      return {
        ok: true,
        data: {
          id: appointmentId,
          companyId: booking.companyId,
          clientId: booking.clientId,
          professionalId: null,
          serviceId: item.serviceId,
          resourceIds: allocationRows.map(
            (allocation) => allocation.resourceId,
          ),
          startsAt: new Date(item.startTime).toISOString(),
          endsAt: new Date(item.endTime).toISOString(),
          state: "cancelled",
        },
        emittedEvents: ["appointment.cancelled"],
      };
    } catch (error) {
      console.error(
        "SISAG SCHEDULING ADAPTER CANCEL APPOINTMENT ERROR:",
        error,
      );

      return {
        ok: false,
        error: {
          code: "SCHEDULING_UNKNOWN_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Erro inesperado ao cancelar o agendamento.",
        },
      };
    }
  }

  async rescheduleAppointment(
    context: SchedulingOperationContext,
    input: RescheduleAppointmentInput,
  ): Promise<SchedulingOperationResult<AppointmentSummary>> {
    try {
      const companyId = context.companyId?.trim();
      const appointmentId = input.appointmentId?.trim();
      const startsAt = new Date(input.startsAt);
      const endsAt = new Date(input.endsAt);

      if (!companyId || !appointmentId) {
        return {
          ok: false,
          error: {
            code: "SCHEDULING_OPERATION_NOT_ALLOWED",
            message: "Empresa e agendamento são obrigatórios para reagendamento.",
          },
        };
      }
      if (
        Number.isNaN(startsAt.getTime()) ||
        Number.isNaN(endsAt.getTime()) ||
        endsAt <= startsAt
      ) {
        return {
          ok: false,
          error: {
            code: "SCHEDULING_OPERATION_NOT_ALLOWED",
            message: "O novo intervalo informado é inválido.",
          },
        };
      }

      const db = getDb();
      const bookingRows = await db
        .select({
          id: bookings.id,
          companyId: bookings.companyId,
          clientId: bookings.clientId,
          status: bookings.status,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.id, appointmentId),
            eq(bookings.companyId, companyId),
          ),
        )
        .limit(1);
      const booking = bookingRows[0];

      if (!booking) {
        return {
          ok: false,
          error: {
            code: "SCHEDULING_APPOINTMENT_NOT_FOUND",
            message:
              "O agendamento informado não foi encontrado no contexto operacional atual.",
          },
        };
      }

      const currentStatus = booking.status?.toUpperCase?.() ?? "";
      if (!["PENDING", "CONFIRMED"].includes(currentStatus)) {
        return {
          ok: false,
          error: {
            code: "SCHEDULING_OPERATION_NOT_ALLOWED",
            message:
              "Somente agendamentos pendentes ou confirmados podem ser reagendados.",
          },
        };
      }

      const itemRows = await db
        .select({
          id: bookingItems.id,
          serviceId: bookingItems.serviceId,
          durationMinutes: bookingItems.durationMinutes,
        })
        .from(bookingItems)
        .where(eq(bookingItems.bookingId, appointmentId));

      if (itemRows.length !== 1) {
        return {
          ok: false,
          error: {
            code: "SCHEDULING_OPERATION_NOT_ALLOWED",
            message:
              "O agendamento não possui uma composição compatível com o reagendamento automático.",
          },
        };
      }

      const item = itemRows[0];
      const expectedEndsAt = new Date(
        startsAt.getTime() + item.durationMinutes * 60_000,
      );
      if (endsAt.getTime() !== expectedEndsAt.getTime()) {
        return {
          ok: false,
          error: {
            code: "SCHEDULING_OPERATION_NOT_ALLOWED",
            message:
              "O horário final informado não corresponde à duração do serviço agendado.",
          },
        };
      }

      const actorMap: Record<string, "admin" | "system" | "whatsapp" | "n8n"> =
        {
          user: "admin",
          agent: "system",
          system: "system",
          api: "system",
        };
      const result = await BookingCoreService.rescheduleById({
        companyId,
        bookingId: appointmentId,
        newStartTime: startsAt.toISOString(),
        actor: actorMap[context.actor.type] ?? "system",
        reason: input.reason ?? null,
      });

      if (result.ok === false) {
        switch (result.error) {
          case "booking_not_found":
            return {
              ok: false,
              error: {
                code: "SCHEDULING_APPOINTMENT_NOT_FOUND",
                message: "O agendamento informado não foi encontrado.",
              },
            };
          case "slot_taken":
            return {
              ok: false,
              error: {
                code: "SCHEDULING_SLOT_NOT_AVAILABLE",
                message: "O novo horário solicitado não está disponível.",
              },
            };
          case "resource_not_found":
            return {
              ok: false,
              error: {
                code: "SCHEDULING_RESOURCE_NOT_FOUND",
                message: "Nenhum recurso compatível foi encontrado.",
              },
            };
          case "service_not_found":
            return {
              ok: false,
              error: {
                code: "SCHEDULING_SERVICE_NOT_FOUND",
                message: "O serviço do agendamento não foi encontrado.",
              },
            };
          case "internal_error":
            return {
              ok: false,
              error: {
                code: "SCHEDULING_UNKNOWN_ERROR",
                message: "Não foi possível reagendar o agendamento.",
              },
            };
          default:
            return {
              ok: false,
              error: {
                code: "SCHEDULING_OPERATION_NOT_ALLOWED",
                message:
                  result.message ??
                  "O agendamento não pode ser reagendado com os dados informados.",
              },
            };
        }
      }

      return {
        ok: true,
        data: {
          id: result.bookingId,
          companyId: result.companyId,
          clientId: result.clientId,
          professionalId: null,
          serviceId: result.serviceId,
          resourceIds: result.resourceIds,
          startsAt: result.newStartTime,
          endsAt: result.newEndTime,
          state: result.status.toLowerCase() as "pending" | "confirmed",
        },
        emittedEvents: ["appointment.rescheduled"],
      };
    } catch (error) {
      console.error(
        "SISAG SCHEDULING ADAPTER RESCHEDULE APPOINTMENT ERROR:",
        error,
      );
      return {
        ok: false,
        error: {
          code: "SCHEDULING_UNKNOWN_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Erro inesperado ao reagendar o agendamento.",
        },
      };
    }
  }

  async completeAppointment(
    _context: SchedulingOperationContext,
    _input: CompleteAppointmentInput,
  ): Promise<SchedulingOperationResult<AppointmentSummary>> {
    throw new Error(
      "SisagSchedulingAdapter.completeAppointment not implemented.",
    );
  }

  async listAppointments(
    _context: SchedulingOperationContext,
    _input?: {
      state?: SchedulingAppointmentState;
      from?: string;
      to?: string;
      clientId?: string;
      professionalId?: string;
    },
  ): Promise<SchedulingOperationResult<AppointmentSummary[]>> {
    throw new Error("SisagSchedulingAdapter.listAppointments not implemented.");
  }

  async getAppointmentJourney(
    _context: SchedulingOperationContext,
    _input: {
      appointmentId: string;
    },
  ): Promise<SchedulingOperationResult<unknown>> {
    throw new Error(
      "SisagSchedulingAdapter.getAppointmentJourney not implemented.",
    );
  }
}
