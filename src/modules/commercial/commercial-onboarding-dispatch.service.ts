import { z } from "zod";

import { outbox } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import {
  planCommercialOnboardingExecution,
  type PlanCommercialOnboardingExecutionInput,
  type PlanCommercialOnboardingExecutionResult,
} from "./commercial-onboarding-executor.service";
import {
  transitionCommercialOnboardingStep,
  type TransitionCommercialOnboardingStepResult,
} from "./commercial-onboarding-workflow.service";

export const dispatchCommercialOnboardingInputSchema = z
  .object({
    onboardingId: z.string().uuid().optional(),
    commercialClientId: z.string().uuid().optional(),
    requestedBy: z.object({
      type: z.enum(["human", "agent", "system", "n8n"]),
      id: z.string().trim().min(1).max(200),
    }),
    reason: z.string().trim().min(3).max(500),
  })
  .refine((value) => Boolean(value.onboardingId) !== Boolean(value.commercialClientId), {
    message: "Informe exatamente onboardingId ou commercialClientId.",
  });

export type DispatchCommercialOnboardingInput = z.input<
  typeof dispatchCommercialOnboardingInputSchema
>;

type SuccessfulPlan = Extract<PlanCommercialOnboardingExecutionResult, { ok: true }>;
type ExecutablePlan = SuccessfulPlan & { command: NonNullable<SuccessfulPlan["command"]> };
type Plan = (
  input: PlanCommercialOnboardingExecutionInput,
) => Promise<PlanCommercialOnboardingExecutionResult>;
type Transition = typeof transitionCommercialOnboardingStep;
type DispatchStore = {
  emitExecutionRequested(input: {
    plan: ExecutablePlan;
    requestedBy: { type: "human" | "agent" | "system" | "n8n"; id: string };
    reason: string;
    requestedAt: Date;
  }): Promise<boolean>;
};

export type DispatchCommercialOnboardingResult =
  | {
      ok: true;
      dispatched: boolean;
      replayed: boolean;
      decision: SuccessfulPlan["decision"];
      reason: string;
      command: SuccessfulPlan["command"];
      transition: {
        replayed: boolean;
        onboardingStatus: string;
        stepStatus: string;
      } | null;
      emittedEvents: string[];
    }
  | {
      ok: false;
      error:
        | "invalid_input"
        | "onboarding_not_found"
        | "planning_failed"
        | "transition_failed"
        | "dispatch_failed";
      message: string;
    };

const executableDecisions = new Set(["execute_system", "execute_agent", "dispatch_n8n"]);

export async function dispatchCommercialOnboarding(
  rawInput: DispatchCommercialOnboardingInput,
  options: {
    plan?: Plan;
    transition?: Transition;
    store?: DispatchStore;
    now?: () => Date;
  } = {},
): Promise<DispatchCommercialOnboardingResult> {
  const parsed = dispatchCommercialOnboardingInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "Despacho de onboarding inválido.",
    };
  }

  const input = parsed.data;
  const requestedBy = {
    type: input.requestedBy.type!,
    id: input.requestedBy.id!,
  };
  const plan = options.plan ?? planCommercialOnboardingExecution;
  const transition = options.transition ?? transitionCommercialOnboardingStep;
  const store = options.store ?? createDrizzleDispatchStore();
  const requestedAt = options.now?.() ?? new Date();

  let planned: PlanCommercialOnboardingExecutionResult;
  try {
    planned = await plan({
      onboardingId: input.onboardingId,
      commercialClientId: input.commercialClientId,
    });
  } catch {
    return { ok: false, error: "planning_failed", message: "Não foi possível planejar o onboarding comercial." };
  }
  if (planned.ok === false) {
    return planned.error === "onboarding_not_found"
      ? { ok: false, error: "onboarding_not_found", message: planned.message }
      : { ok: false, error: "planning_failed", message: planned.message };
  }
  if (!executableDecisions.has(planned.decision) || !planned.command) {
    return {
      ok: true,
      dispatched: false,
      replayed: false,
      decision: planned.decision,
      reason: planned.reason,
      command: planned.command,
      transition: null,
      emittedEvents: [],
    };
  }

  const executablePlan = planned as ExecutablePlan;
  let transitioned: TransitionCommercialOnboardingStepResult;
  try {
    transitioned = await transition({
      onboardingId: executablePlan.command.onboardingId,
      stepCode: executablePlan.command.stepCode,
      action: "start",
      actor: {
        type: executablePlan.command.executorType,
        id: `onboarding-dispatch:${requestedBy.id}`,
      },
      reason: input.reason,
      input: {
        dispatchKey: executablePlan.command.key,
        requestedBy,
        executionInput: executablePlan.command.input,
      },
    });
  } catch {
    return { ok: false, error: "transition_failed", message: "Não foi possível reservar a etapa do onboarding." };
  }
  if (transitioned.ok === false) {
    return { ok: false, error: "transition_failed", message: transitioned.message };
  }

  let emitted: boolean;
  try {
    emitted = await store.emitExecutionRequested({
      plan: executablePlan,
      requestedBy,
      reason: input.reason,
      requestedAt,
    });
  } catch {
    return { ok: false, error: "dispatch_failed", message: "A etapa foi reservada, mas a solicitação de execução não pôde ser registrada." };
  }

  return {
    ok: true,
    dispatched: emitted,
    replayed: transitioned.replayed || !emitted,
    decision: executablePlan.decision,
    reason: executablePlan.reason,
    command: executablePlan.command,
    transition: {
      replayed: transitioned.replayed,
      onboardingStatus: transitioned.onboarding.status,
      stepStatus: transitioned.step.status,
    },
    emittedEvents: emitted ? ["commercial.onboarding.execution_requested"] : [],
  };
}

function createDrizzleDispatchStore(): DispatchStore {
  const db = getDb();
  return {
    async emitExecutionRequested(values) {
      const command = values.plan.command;
      const rows = await db
        .insert(outbox)
        .values({
          aggregateType: "commercial_onboarding",
          aggregateId: command.onboardingId,
          eventType: "commercial.onboarding.execution_requested",
          dedupeKey: `commercial.onboarding.execution_requested:${command.key}`,
          payload: {
            command,
            decision: values.plan.decision,
            requestedBy: values.requestedBy,
            reason: values.reason,
            requestedAt: values.requestedAt.toISOString(),
          },
        })
        .onConflictDoNothing()
        .returning({ id: outbox.id });
      return Boolean(rows[0]);
    },
  };
}
