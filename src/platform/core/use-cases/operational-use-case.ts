import type { PlatformResult } from "../types";

export type OperationalUseCaseActorType = "user" | "agent" | "system" | "api";

export type OperationalUseCaseActor = {
  type: OperationalUseCaseActorType;
  id: string;
  name?: string | null;
};

export type OperationalUseCaseContext = {
  companyId: string;
  actor: OperationalUseCaseActor;

  correlationId: string;
  causationId?: string | null;

  requestedAt: string;
};

export type OperationalUseCaseError = {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
};

export interface OperationalUseCase<TInput, TOutput> {
  execute(
    context: OperationalUseCaseContext,
    input: TInput,
  ): Promise<PlatformResult<TOutput, OperationalUseCaseError>>;
}
