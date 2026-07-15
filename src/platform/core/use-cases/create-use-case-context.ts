import type {
  OperationalUseCaseActor,
  OperationalUseCaseContext,
} from "./operational-use-case";

type CreateOperationalUseCaseContextInput = {
  companyId: string;
  actor: OperationalUseCaseActor;
  correlationId?: string | null;
  causationId?: string | null;
};

export function createOperationalUseCaseContext(
  input: CreateOperationalUseCaseContextInput,
): OperationalUseCaseContext {
  return {
    companyId: input.companyId,
    actor: input.actor,
    correlationId: input.correlationId ?? crypto.randomUUID(),
    causationId: input.causationId ?? null,
    requestedAt: new Date().toISOString(),
  };
}
