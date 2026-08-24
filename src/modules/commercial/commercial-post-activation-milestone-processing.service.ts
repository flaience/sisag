import { eq } from "drizzle-orm";
import { z } from "zod";

import { commercialOnboardings, outbox } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import { executeCommercialPostActivationMilestone } from "./commercial-post-activation-milestone-executor.service";
import type { CommercialPostActivationFollowUpPlan } from "./commercial-post-activation-follow-up.service";

const inputSchema = z.object({
  onboardingId: z.string().uuid(),
  expectedMilestoneCode: z.string().trim().min(1).max(100)
    .regex(/^[a-z0-9][a-z0-9_]*$/).optional(),
  observations: z.record(z.string(), z.boolean()).default({}),
});

const executionSchema = z.object({
  milestoneCode: z.string().trim().min(1).max(100),
  outcome: z.enum(["completed", "escalated"]),
  processedAt: z.string().datetime(),
});

export type ProcessCommercialPostActivationMilestoneInput = z.input<typeof inputSchema>;

type ProcessingRecord = {
  onboardingId: string;
  result: Record<string, unknown>;
};

type ProcessingStore = {
  transaction<T>(callback: (tx: {
    findOnboarding(onboardingId: string): Promise<ProcessingRecord | null>;
    saveResult(onboardingId: string, result: Record<string, unknown>, updatedAt: Date): Promise<void>;
    emit(input: {
      aggregateId: string;
      eventType: string;
      dedupeKey: string;
      payload: Record<string, unknown>;
    }): Promise<boolean>;
  }) => Promise<T>): Promise<T>;
};

export type ProcessCommercialPostActivationMilestoneResult =
  | {
      ok: true;
      replayed: boolean;
      decision: "wait" | "completed" | "human_escalation" | "plan_completed";
      onboardingId: string;
      milestoneCode: string | null;
      missingIndicators: string[];
      activeEscalations: string[];
      emittedEvents: string[];
    }
  | {
      ok: false;
      error:
        | "invalid_input"
        | "onboarding_not_found"
        | "follow_up_not_scheduled"
        | "invalid_follow_up_state"
        | "milestone_mismatch";
      message: string;
    };

export async function processCommercialPostActivationMilestone(
  rawInput: ProcessCommercialPostActivationMilestoneInput,
  options: { store?: ProcessingStore; now?: () => Date } = {},
): Promise<ProcessCommercialPostActivationMilestoneResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "Dados de processamento inválidos.",
    };
  }

  const input = parsed.data;
  const store = options.store ?? createDrizzleProcessingStore();
  const now = options.now?.() ?? new Date();

  return store.transaction(async (tx) => {
    const onboarding = await tx.findOnboarding(input.onboardingId);
    if (!onboarding) {
      return {
        ok: false,
        error: "onboarding_not_found",
        message: "O onboarding informado não foi encontrado.",
      };
    }

    const plan = onboarding.result.postActivationFollowUpPlan;
    if (!plan || typeof plan !== "object") {
      return {
        ok: false,
        error: "follow_up_not_scheduled",
        message: "O acompanhamento pós-ativação ainda não foi agendado.",
      };
    }

    const rawExecutions = onboarding.result.postActivationMilestoneExecutions ?? [];
    const parsedExecutions = z.array(executionSchema).max(100).safeParse(rawExecutions);
    if (!parsedExecutions.success) {
      return {
        ok: false,
        error: "invalid_follow_up_state",
        message: "O histórico do acompanhamento pós-ativação é inválido.",
      };
    }

    const execution = executeCommercialPostActivationMilestone({
      plan: plan as CommercialPostActivationFollowUpPlan,
      executions: parsedExecutions.data,
      observations: input.observations,
    }, { now: () => now });
    if (execution.ok === false) {
      return {
        ok: false,
        error: "invalid_follow_up_state",
        message: execution.message,
      };
    }
    if (
      input.expectedMilestoneCode
      && execution.milestone?.code !== input.expectedMilestoneCode
    ) {
      return {
        ok: false,
        error: "milestone_mismatch",
        message: "O marco reivindicado não corresponde ao próximo marco do plano.",
      };
    }

    if (!execution.event || !execution.milestone) {
      return {
        ok: true,
        replayed: execution.replayed,
        decision: execution.decision,
        onboardingId: input.onboardingId,
        milestoneCode: execution.milestone?.code ?? null,
        missingIndicators: execution.missingIndicators,
        activeEscalations: execution.activeEscalations,
        emittedEvents: [],
      };
    }

    const outcome = execution.decision === "completed" ? "completed" : "escalated";
    const updatedExecutions = [
      ...parsedExecutions.data,
      {
        milestoneCode: execution.milestone.code,
        outcome,
        processedAt: now.toISOString(),
      },
    ];
    await tx.saveResult(input.onboardingId, {
      ...onboarding.result,
      postActivationMilestoneExecutions: updatedExecutions,
    }, now);
    const emitted = await tx.emit({
      aggregateId: input.onboardingId,
      eventType: execution.event.eventType,
      dedupeKey: execution.event.dedupeKey,
      payload: execution.event.payload,
    });

    return {
      ok: true,
      replayed: false,
      decision: execution.decision,
      onboardingId: input.onboardingId,
      milestoneCode: execution.milestone.code,
      missingIndicators: execution.missingIndicators,
      activeEscalations: execution.activeEscalations,
      emittedEvents: emitted ? [execution.event.eventType] : [],
    };
  });
}

function createDrizzleProcessingStore(): ProcessingStore {
  const db = getDb();
  return {
    transaction: (callback) => db.transaction(async (databaseTx) => callback({
      async findOnboarding(onboardingId) {
        const rows = await databaseTx.select({
          onboardingId: commercialOnboardings.id,
          result: commercialOnboardings.result,
        }).from(commercialOnboardings)
          .where(eq(commercialOnboardings.id, onboardingId))
          .limit(1)
          .for("update");
        const row = rows[0];
        return row ? {
          onboardingId: row.onboardingId,
          result: (row.result ?? {}) as Record<string, unknown>,
        } : null;
      },
      async saveResult(onboardingId, result, updatedAt) {
        await databaseTx.update(commercialOnboardings)
          .set({ result, updatedAt })
          .where(eq(commercialOnboardings.id, onboardingId));
      },
      async emit(value) {
        const rows = await databaseTx.insert(outbox).values({
          aggregateType: "commercial_onboarding",
          aggregateId: value.aggregateId,
          eventType: value.eventType,
          dedupeKey: value.dedupeKey,
          payload: value.payload,
        }).onConflictDoNothing().returning({ id: outbox.id });
        return Boolean(rows[0]);
      },
    })),
  };
}
