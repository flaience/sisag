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
import { BookingService } from "@/modules/bookings/Booking.service";

import {
  bookingItemAllocations,
  bookingItems,
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

      /*
       * O modelo atual associa o profissional a um recurso operacional.
       * Essa resolução pertence ao adapter, pois é uma particularidade
       * da implementação atual do SISAG.
       */
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

        /*
         * Impede que um profissional de outra empresa seja utilizado
         * no contexto operacional atual.
         */
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

      /*
       * No modo manual, o AvailabilityService exige duração e recurso.
       * No modo por serviço, a duração pode ser obtida do próprio serviço
       * e os recursos podem ser resolvidos pelos requirements.
       */
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

      /*
       * Evita solicitar mais pontos do que o intervalo comporta
       * e mantém um limite absoluto de segurança.
       */
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
        /*
         * O serviço pode produzir pontos depois do limite desejado,
         * portanto o adapter aplica o limite contratual dateTo.
         */
        .filter((slot) => {
          const startsAt = new Date(slot.startTime);

          return (
            !Number.isNaN(startsAt.getTime()) &&
            startsAt >= dateFrom &&
            startsAt < dateTo
          );
        })
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

      /*
       * O BookingService atual resolve os recursos por meio dos
       * requisitos do serviço e, opcionalmente, do profissional.
       *
       * Recursos explícitos não podem ser ignorados silenciosamente.
       */
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

      /*
       * Confirma que o serviço pertence à empresa atual e valida
       * o término solicitado antes de criar qualquer registro.
       */
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

      const created = await BookingService.createAuto({
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

      /*
       * O BookingService continua inalterado. O Adapter consulta apenas
       * os dados necessários para traduzir Booking em AppointmentSummary.
       */
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
    _context: SchedulingOperationContext,
    _input: ConfirmAppointmentInput,
  ): Promise<SchedulingOperationResult<AppointmentSummary>> {
    throw new Error(
      "SisagSchedulingAdapter.confirmAppointment not implemented.",
    );
  }

  async cancelAppointment(
    _context: SchedulingOperationContext,
    _input: CancelAppointmentInput,
  ): Promise<SchedulingOperationResult<AppointmentSummary>> {
    throw new Error(
      "SisagSchedulingAdapter.cancelAppointment not implemented.",
    );
  }

  async rescheduleAppointment(
    _context: SchedulingOperationContext,
    _input: RescheduleAppointmentInput,
  ): Promise<SchedulingOperationResult<AppointmentSummary>> {
    throw new Error(
      "SisagSchedulingAdapter.rescheduleAppointment not implemented.",
    );
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
