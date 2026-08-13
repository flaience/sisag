import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import {
  commercialClients,
  commercialOnboardingSteps,
  commercialOnboardings,
  outbox,
} from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import { guardCommercialOnboardingCompletion } from "./commercial-onboarding-completion-guard.service";

const actionSchema = z.enum(["start", "complete", "block", "resume", "skip", "cancel"]);
const actorSchema = z.object({
  type: z.enum(["human", "agent", "system", "n8n"]),
  id: z.string().trim().min(1).max(200),
});

export const transitionCommercialOnboardingStepInputSchema = z.object({
  onboardingId: z.string().uuid(),
  stepCode: z.string().trim().regex(/^[a-z0-9][a-z0-9_]*$/),
  action: actionSchema,
  actor: actorSchema,
  reason: z.string().trim().min(3).max(500),
  input: z.record(z.string(), z.unknown()).optional(),
  result: z.record(z.string(), z.unknown()).optional(),
  error: z.string().trim().max(2000).optional(),
});

export type TransitionCommercialOnboardingStepInput = z.input<
  typeof transitionCommercialOnboardingStepInputSchema
>;
type Action = z.infer<typeof actionSchema>;
type StepStatus = "pending" | "in_progress" | "blocked" | "completed" | "skipped" | "cancelled";
type OnboardingStatus = "pending" | "in_progress" | "blocked" | "completed" | "cancelled";
type StepRecord = { id: string; code: string; position: number; status: StepStatus; attempts: number; input: unknown };
type OnboardingRecord = {
  id: string;
  commercialClientId: string;
  status: OnboardingStatus;
  currentStepCode: string | null;
};

const transitions: Record<Action, readonly StepStatus[]> = {
  start: ["pending"],
  complete: ["in_progress"],
  block: ["in_progress"],
  resume: ["blocked"],
  skip: ["pending", "blocked"],
  cancel: ["pending", "in_progress", "blocked"],
};

type WorkflowTransaction = {
  findOnboardingForUpdate(id: string): Promise<OnboardingRecord | null>;
  listStepsForUpdate(id: string): Promise<StepRecord[]>;
  updateStep(input: {
    id: string; status: StepStatus; actor: z.infer<typeof actorSchema>; attempts: number;
    input?: Record<string, unknown>; result?: Record<string, unknown>; error: string | null;
    startedAt?: Date; completedAt?: Date; updatedAt: Date;
  }): Promise<void>;
  updateOnboarding(input: {
    id: string; status: OnboardingStatus; currentStepCode: string | null;
    blockedReason: string | null; result?: Record<string, unknown>;
    startedAt?: Date; completedAt?: Date; cancelledAt?: Date; updatedAt: Date;
  }): Promise<void>;
  activateClient(id: string, changedAt: Date): Promise<void>;
  emit(input: { aggregateId: string; eventType: string; dedupeKey: string; payload: Record<string, unknown> }): Promise<boolean>;
};
type WorkflowStore = { transaction<T>(callback: (tx: WorkflowTransaction) => Promise<T>): Promise<T> };

export type TransitionCommercialOnboardingStepResult =
  | { ok: true; replayed: boolean; onboarding: { id: string; status: OnboardingStatus; currentStepCode: string | null }; step: { code: string; status: StepStatus; attempts: number }; emittedEvents: string[] }
  | { ok: false; error: "invalid_input" | "onboarding_not_found" | "step_not_found" | "onboarding_terminal" | "step_out_of_order" | "transition_not_allowed" | "completion_requirements_not_met"; message: string };

function targetStatus(action: Action): StepStatus {
  return { start: "in_progress", complete: "completed", block: "blocked", resume: "in_progress", skip: "skipped", cancel: "cancelled" }[action] as StepStatus;
}

export async function transitionCommercialOnboardingStep(
  rawInput: TransitionCommercialOnboardingStepInput,
  options: { store?: WorkflowStore; now?: () => Date } = {},
): Promise<TransitionCommercialOnboardingStepResult> {
  const parsed = transitionCommercialOnboardingStepInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const input = parsed.data;
  const store = options.store ?? createDrizzleWorkflowStore();
  const now = options.now?.() ?? new Date();

  return store.transaction(async (tx) => {
    const onboarding = await tx.findOnboardingForUpdate(input.onboardingId);
    if (!onboarding) return { ok: false, error: "onboarding_not_found", message: "O onboarding informado não foi encontrado." };
    if (["completed", "cancelled"].includes(onboarding.status)) return { ok: false, error: "onboarding_terminal", message: "O onboarding já está em estado terminal." };
    const steps = await tx.listStepsForUpdate(onboarding.id);
    const step = steps.find((item) => item.code === input.stepCode);
    if (!step) return { ok: false, error: "step_not_found", message: "A etapa informada não foi encontrada." };
    const desired = targetStatus(input.action);
    if (step.status === desired) return { ok: true, replayed: true, onboarding: { id: onboarding.id, status: onboarding.status, currentStepCode: onboarding.currentStepCode }, step: { code: step.code, status: step.status, attempts: step.attempts }, emittedEvents: [] };
    const current = steps.find((item) => !["completed", "skipped", "cancelled"].includes(item.status));
    if (input.action !== "cancel" && current?.id !== step.id) return { ok: false, error: "step_out_of_order", message: "A etapa não é a próxima etapa executável." };
    if (!transitions[input.action].includes(step.status)) return { ok: false, error: "transition_not_allowed", message: `A ação ${input.action} não é permitida para uma etapa ${step.status}.` };
    if (input.action === "complete" && step.code === "complete_onboarding") {
      const completion = guardCommercialOnboardingCompletion(steps);
      if (completion.allowed === false) {
        return {
          ok: false,
          error: "completion_requirements_not_met",
          message: completion.message,
        };
      }
    }

    const attempts = step.attempts + (input.action === "start" || input.action === "resume" ? 1 : 0);
    await tx.updateStep({
      id: step.id, status: desired, actor: input.actor, attempts,
      input: input.input, result: input.result,
      error: input.action === "block" ? input.error ?? input.reason : null,
      startedAt: input.action === "start" || input.action === "resume" ? now : undefined,
      completedAt: input.action === "complete" || input.action === "skip" || input.action === "cancel" ? now : undefined,
      updatedAt: now,
    });

    const projected = steps.map((item) => item.id === step.id ? { ...item, status: desired } : item);
    const next = projected.find((item) => !["completed", "skipped", "cancelled"].includes(item.status));
    const completed = projected.every((item) => item.status === "completed" || item.status === "skipped");
    const cancelled = input.action === "cancel";
    const onboardingStatus: OnboardingStatus = cancelled ? "cancelled" : completed ? "completed" : desired === "blocked" ? "blocked" : "in_progress";
    const currentStepCode = completed || cancelled ? null : next?.code ?? null;
    await tx.updateOnboarding({
      id: onboarding.id, status: onboardingStatus, currentStepCode,
      blockedReason: desired === "blocked" ? input.error ?? input.reason : null,
      result: completed ? input.result : undefined,
      startedAt: onboarding.status === "pending" ? now : undefined,
      completedAt: completed ? now : undefined,
      cancelledAt: cancelled ? now : undefined,
      updatedAt: now,
    });
    if (completed) await tx.activateClient(onboarding.commercialClientId, now);

    const eventType = completed ? "commercial.onboarding.completed" : "commercial.onboarding.step_changed";
    const emitted = await tx.emit({
      aggregateId: onboarding.id,
      eventType,
      dedupeKey: `${eventType}:${onboarding.id}:${step.code}:${step.status}:${desired}`,
      payload: { onboardingId: onboarding.id, commercialClientId: onboarding.commercialClientId, stepCode: step.code, action: input.action, before: { status: step.status }, after: { status: desired }, actor: input.actor, reason: input.reason, changedAt: now.toISOString() },
    });
    return { ok: true, replayed: false, onboarding: { id: onboarding.id, status: onboardingStatus, currentStepCode }, step: { code: step.code, status: desired, attempts }, emittedEvents: emitted ? [eventType] : [] };
  });
}

function createDrizzleWorkflowStore(): WorkflowStore {
  const db = getDb();
  return { transaction: (callback) => db.transaction(async (databaseTx) => callback({
    async findOnboardingForUpdate(id) {
      const rows = await databaseTx.select({ id: commercialOnboardings.id, commercialClientId: commercialOnboardings.commercialClientId, status: commercialOnboardings.status, currentStepCode: commercialOnboardings.currentStepCode }).from(commercialOnboardings).where(eq(commercialOnboardings.id, id)).limit(1).for("update");
      return rows[0] ?? null;
    },
    async listStepsForUpdate(id) {
      return databaseTx.select({ id: commercialOnboardingSteps.id, code: commercialOnboardingSteps.code, position: commercialOnboardingSteps.position, status: commercialOnboardingSteps.status, attempts: commercialOnboardingSteps.attempts, input: commercialOnboardingSteps.input }).from(commercialOnboardingSteps).where(eq(commercialOnboardingSteps.onboardingId, id)).orderBy(asc(commercialOnboardingSteps.position)).for("update");
    },
    async updateStep(value) {
      await databaseTx.update(commercialOnboardingSteps).set({ status: value.status, executorType: value.actor.type, executorId: value.actor.id, attempts: value.attempts, ...(value.input === undefined ? {} : { input: value.input }), ...(value.result === undefined ? {} : { result: value.result }), lastError: value.error, ...(value.startedAt ? { startedAt: value.startedAt } : {}), ...(value.completedAt ? { completedAt: value.completedAt } : {}), updatedAt: value.updatedAt }).where(eq(commercialOnboardingSteps.id, value.id));
    },
    async updateOnboarding(value) {
      await databaseTx.update(commercialOnboardings).set({ status: value.status, currentStepCode: value.currentStepCode, blockedReason: value.blockedReason, ...(value.result === undefined ? {} : { result: value.result }), ...(value.startedAt ? { startedAt: value.startedAt } : {}), ...(value.completedAt ? { completedAt: value.completedAt } : {}), ...(value.cancelledAt ? { cancelledAt: value.cancelledAt } : {}), updatedAt: value.updatedAt }).where(eq(commercialOnboardings.id, value.id));
    },
    async activateClient(id, changedAt) { await databaseTx.update(commercialClients).set({ status: "active", updatedAt: changedAt }).where(and(eq(commercialClients.id, id), sql`${commercialClients.status} <> 'closed'`)); },
    async emit(value) { const rows = await databaseTx.insert(outbox).values({ aggregateType: "commercial_onboarding", aggregateId: value.aggregateId, eventType: value.eventType, dedupeKey: value.dedupeKey, payload: value.payload }).onConflictDoNothing().returning({ id: outbox.id }); return Boolean(rows[0]); },
  })) };
}
