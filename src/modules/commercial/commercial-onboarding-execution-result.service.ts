import { eq } from "drizzle-orm";
import { z } from "zod";

import { outbox } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import { getCommercialOnboardingQuery } from "./commercial-onboarding-query.service";
import { transitionCommercialOnboardingStep } from "./commercial-onboarding-workflow.service";

const commandKeyPattern = /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}):([a-z0-9][a-z0-9_]*):start$/i;

export const submitCommercialOnboardingExecutionResultInputSchema = z.object({
  commandKey: z.string().trim().regex(commandKeyPattern),
  outcome: z.enum(["completed", "blocked", "failed", "human_required"]),
  executor: z.object({
    type: z.enum(["human", "agent", "system", "n8n"]),
    id: z.string().trim().min(1).max(200),
  }),
  reason: z.string().trim().min(3).max(500),
  result: z.record(z.string(), z.unknown()).optional(),
  error: z.string().trim().min(1).max(2000).optional(),
});

export type SubmitCommercialOnboardingExecutionResultInput = z.input<
  typeof submitCommercialOnboardingExecutionResultInputSchema
>;
type ParsedInput = z.output<typeof submitCommercialOnboardingExecutionResultInputSchema>;

type ResultStore = {
  wasReceived(dedupeKey: string): Promise<boolean>;
  emitReceived(input: {
    dedupeKey: string;
    onboardingId: string;
    stepCode: string;
    data: ParsedInput;
    receivedAt: Date;
  }): Promise<boolean>;
};

export type SubmitCommercialOnboardingExecutionResult =
  | {
      ok: true;
      replayed: boolean;
      outcome: ParsedInput["outcome"];
      onboarding: { id: string; status: string; currentStepCode: string | null } | null;
      step: { code: string; status: string; attempts: number } | null;
      emittedEvents: string[];
    }
  | {
      ok: false;
      error:
        | "invalid_input"
        | "onboarding_not_found"
        | "command_mismatch"
        | "executor_mismatch"
        | "step_not_in_progress"
        | "transition_failed"
        | "result_record_failed";
      message: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function submitCommercialOnboardingExecutionResult(
  rawInput: SubmitCommercialOnboardingExecutionResultInput,
  options: {
    query?: typeof getCommercialOnboardingQuery;
    transition?: typeof transitionCommercialOnboardingStep;
    store?: ResultStore;
    now?: () => Date;
  } = {},
): Promise<SubmitCommercialOnboardingExecutionResult> {
  const parsed = submitCommercialOnboardingExecutionResultInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Resultado de execução inválido." };
  }
  const input = parsed.data;
  const match = commandKeyPattern.exec(input.commandKey)!;
  const onboardingId = match[1]!;
  const stepCode = match[2]!;
  const dedupeKey = `commercial.onboarding.execution_result_received:${input.commandKey}:${input.outcome}`;
  const store = options.store ?? createDrizzleResultStore();

  if (await store.wasReceived(dedupeKey)) {
    return { ok: true, replayed: true, outcome: input.outcome, onboarding: null, step: null, emittedEvents: [] };
  }

  const query = options.query ?? getCommercialOnboardingQuery;
  const state = await query({ onboardingId });
  if (state.ok === false) {
    return state.error === "onboarding_not_found"
      ? { ok: false, error: "onboarding_not_found", message: state.message }
      : { ok: false, error: "invalid_input", message: state.message };
  }
  const step = state.data.currentStep;
  if (!step || step.code !== stepCode) {
    return { ok: false, error: "command_mismatch", message: "O comando não corresponde à etapa atual do onboarding." };
  }
  if (!isRecord(step.input) || step.input.dispatchKey !== input.commandKey) {
    return { ok: false, error: "command_mismatch", message: "A etapa atual não foi reservada por este comando." };
  }
  if (step.status !== "in_progress") {
    return { ok: false, error: "step_not_in_progress", message: "A etapa não está aguardando um resultado de execução." };
  }
  if (step.executorType !== input.executor.type) {
    return { ok: false, error: "executor_mismatch", message: "O tipo do executor não corresponde ao executor reservado." };
  }

  const transition = options.transition ?? transitionCommercialOnboardingStep;
  const action = input.outcome === "completed" ? "complete" : "block";
  const transitionResult = await transition({
    onboardingId,
    stepCode,
    action,
    actor: { type: input.executor.type!, id: input.executor.id! },
    reason: input.reason,
    result: input.result,
    error: input.error ?? (input.outcome === "failed" ? input.reason : input.outcome === "human_required" ? `Intervenção humana necessária: ${input.reason}` : input.reason),
  });
  if (transitionResult.ok === false) {
    return { ok: false, error: "transition_failed", message: transitionResult.message };
  }

  let emitted: boolean;
  try {
    emitted = await store.emitReceived({
      dedupeKey,
      onboardingId,
      stepCode,
      data: input,
      receivedAt: options.now?.() ?? new Date(),
    });
  } catch {
    return { ok: false, error: "result_record_failed", message: "A transição foi aplicada, mas o resultado da execução não pôde ser registrado." };
  }

  return {
    ok: true,
    replayed: !emitted,
    outcome: input.outcome,
    onboarding: transitionResult.onboarding,
    step: transitionResult.step,
    emittedEvents: emitted ? ["commercial.onboarding.execution_result_received"] : [],
  };
}

function createDrizzleResultStore(): ResultStore {
  const db = getDb();
  return {
    async wasReceived(dedupeKey) {
      const rows = await db.select({ id: outbox.id }).from(outbox).where(eq(outbox.dedupeKey, dedupeKey)).limit(1);
      return Boolean(rows[0]);
    },
    async emitReceived(values) {
      const rows = await db
        .insert(outbox)
        .values({
          aggregateType: "commercial_onboarding",
          aggregateId: values.onboardingId,
          eventType: "commercial.onboarding.execution_result_received",
          dedupeKey: values.dedupeKey,
          payload: {
            commandKey: values.data.commandKey,
            onboardingId: values.onboardingId,
            stepCode: values.stepCode,
            outcome: values.data.outcome,
            executor: values.data.executor,
            reason: values.data.reason,
            result: values.data.result,
            error: values.data.error,
            receivedAt: values.receivedAt.toISOString(),
          },
        })
        .onConflictDoNothing()
        .returning({ id: outbox.id });
      return Boolean(rows[0]);
    },
  };
}
