import type {
  AvailableSlot,
  FindAvailableSlotsInput,
  SchedulingOperationsPort,
} from "@/platform/capabilities/scheduling";
import type {
  OperationalUseCase,
  OperationalUseCaseContext,
  OperationalUseCaseError,
} from "@/platform/core/use-cases";
import type { PlatformResult } from "@/platform/core/types";

export class FindAvailableSlotsUseCase implements OperationalUseCase<
  FindAvailableSlotsInput,
  AvailableSlot[]
> {
  constructor(
    private readonly schedulingOperations: SchedulingOperationsPort,
  ) {}

  async execute(
    context: OperationalUseCaseContext,
    input: FindAvailableSlotsInput,
  ): Promise<PlatformResult<AvailableSlot[], OperationalUseCaseError>> {
    const result = await this.schedulingOperations.findAvailableSlots(
      {
        companyId: context.companyId,
        actor: context.actor,
        correlationId: context.correlationId,
        causationId: context.causationId,
      },
      input,
    );

    if (result.ok === false) {
      return {
        ok: false,
        error: {
          code: result.error?.code ?? "SCHEDULING_UNKNOWN_ERROR",
          message:
            result.error?.message ??
            "Não foi possível consultar os horários disponíveis.",
        },
      };
    }

    return {
      ok: true,
      value: result.data ?? [],
    };
  }
}
