import { z } from "zod";

import {
  submitCommercialOnboardingExecutionResult,
  type SubmitCommercialOnboardingExecutionResult,
} from "./commercial-onboarding-execution-result.service";

const executorTypeSchema = z.enum(["human", "agent", "system", "n8n"]);
const outcomeSchema = z.enum(["completed", "blocked", "failed", "human_required"]);

export const commercialOnboardingExecutionRequestSchema = z.object({
  command: z.object({
    key: z.string().trim().min(1),
    action: z.literal("start"),
    onboardingId: z.string().uuid(),
    commercialClientId: z.string().uuid(),
    stepCode: z.string().trim().regex(/^[a-z0-9][a-z0-9_]*$/),
    stepPosition: z.number().int().positive(),
    executorType: executorTypeSchema,
    input: z.record(z.string(), z.unknown()),
  }),
  decision: z.enum(["execute_system", "execute_agent", "dispatch_n8n"]),
  requestedBy: z.object({
    type: executorTypeSchema,
    id: z.string().trim().min(1).max(200),
  }),
  reason: z.string().trim().min(3).max(500),
  requestedAt: z.string().datetime(),
});

type ExecutionRequest = z.output<typeof commercialOnboardingExecutionRequestSchema>;
type Command = ExecutionRequest["command"];
type ExecutorType = z.output<typeof executorTypeSchema>;

export type CommercialOnboardingRuntimeAdapterResult = {
  outcome: z.output<typeof outcomeSchema>;
  reason: string;
  result?: Record<string, unknown>;
  error?: string;
};

export type CommercialOnboardingRuntimeAdapter = {
  id: string;
  execute(command: Command): Promise<CommercialOnboardingRuntimeAdapterResult>;
};

type SubmitResult = (
  input: Parameters<typeof submitCommercialOnboardingExecutionResult>[0],
) => Promise<SubmitCommercialOnboardingExecutionResult>;

export type ExecuteCommercialOnboardingRuntimeResult =
  | {
      ok: true;
      commandKey: string;
      executor: { type: ExecutorType; id: string };
      outcome: z.output<typeof outcomeSchema>;
      replayed: boolean;
      onboarding: { id: string; status: string; currentStepCode: string | null } | null;
      step: { code: string; status: string; attempts: number } | null;
      emittedEvents: string[];
    }
  | {
      ok: false;
      error:
        | "invalid_event"
        | "decision_mismatch"
        | "executor_unavailable"
        | "execution_failed"
        | "result_rejected";
      message: string;
    };

const expectedDecision = {
  system: "execute_system",
  agent: "execute_agent",
  n8n: "dispatch_n8n",
} as const;

function validAdapterResult(value: unknown): CommercialOnboardingRuntimeAdapterResult | null {
  const parsed = z.object({
    outcome: outcomeSchema,
    reason: z.string().trim().min(3).max(500),
    result: z.record(z.string(), z.unknown()).optional(),
    error: z.string().trim().min(1).max(2000).optional(),
  }).safeParse(value);
  if (!parsed.success) return null;
  return {
    outcome: parsed.data.outcome!,
    reason: parsed.data.reason!,
    result: parsed.data.result,
    error: parsed.data.error,
  };
}

export async function executeCommercialOnboardingRuntime(
  rawEvent: unknown,
  options: {
    adapters?: Partial<Record<"agent" | "system" | "n8n", CommercialOnboardingRuntimeAdapter>>;
    submit?: SubmitResult;
  } = {},
): Promise<ExecuteCommercialOnboardingRuntimeResult> {
  const parsed = commercialOnboardingExecutionRequestSchema.safeParse(rawEvent);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_event",
      message: parsed.error.issues[0]?.message ?? "Evento de execução inválido.",
    };
  }

  const event = parsed.data;
  const executorType = event.command.executorType;
  if (executorType === "human") {
    return {
      ok: false,
      error: "decision_mismatch",
      message: "Etapas humanas não podem ser executadas automaticamente.",
    };
  }
  if (event.decision !== expectedDecision[executorType]) {
    return {
      ok: false,
      error: "decision_mismatch",
      message: "A decisão de execução não corresponde ao tipo de executor.",
    };
  }

  const adapter = options.adapters?.[executorType];
  if (!adapter) {
    return {
      ok: false,
      error: "executor_unavailable",
      message: `Nenhum executor ${executorType} está configurado para esta etapa.`,
    };
  }

  let adapterResult: CommercialOnboardingRuntimeAdapterResult | null;
  try {
    adapterResult = validAdapterResult(await adapter.execute(event.command));
  } catch {
    return {
      ok: false,
      error: "execution_failed",
      message: "O executor não conseguiu processar a etapa do onboarding.",
    };
  }
  if (!adapterResult) {
    return {
      ok: false,
      error: "execution_failed",
      message: "O executor devolveu um resultado inválido.",
    };
  }

  const submit = options.submit ?? submitCommercialOnboardingExecutionResult;
  let submitted: SubmitCommercialOnboardingExecutionResult;
  try {
    submitted = await submit({
      commandKey: event.command.key,
      outcome: adapterResult.outcome,
      executor: { type: executorType, id: adapter.id },
      reason: adapterResult.reason,
      result: adapterResult.result,
      error: adapterResult.error,
    });
  } catch {
    return {
      ok: false,
      error: "result_rejected",
      message: "O resultado foi produzido, mas não pôde ser entregue ao onboarding.",
    };
  }
  if (submitted.ok === false) {
    return { ok: false, error: "result_rejected", message: submitted.message };
  }

  return {
    ok: true,
    commandKey: event.command.key,
    executor: { type: executorType, id: adapter.id },
    outcome: adapterResult.outcome,
    replayed: submitted.replayed,
    onboarding: submitted.onboarding,
    step: submitted.step,
    emittedEvents: submitted.emittedEvents,
  };
}
