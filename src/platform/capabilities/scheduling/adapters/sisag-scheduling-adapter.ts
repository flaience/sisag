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
import { eq } from "drizzle-orm";

import { professionals } from "@/drizzle/schema";
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
    _context: SchedulingOperationContext,
    _input: CreateAppointmentInput,
  ): Promise<SchedulingOperationResult<AppointmentSummary>> {
    throw new Error(
      "SisagSchedulingAdapter.createAppointment not implemented.",
    );
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
