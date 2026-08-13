import { eq } from "drizzle-orm";
import { z } from "zod";

import { commercialClients, commercialOnboardings, outbox } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import { buildCommercialPostActivationFollowUp } from "./commercial-post-activation-follow-up.service";

const inputSchema = z.object({
  onboardingId: z.string().uuid(),
  companyId: z.string().uuid(),
  context: z.object({
    businessType: z.string().trim().min(1).max(100),
    activeChannels: z.array(z.string().trim().min(1).max(32)).min(1).max(20),
    teamSize: z.number().int().positive().max(1000),
  }),
  scheduledBy: z.object({
    type: z.enum(["human", "agent", "system", "n8n"]),
    id: z.string().trim().min(1).max(200),
  }),
});

export type ScheduleCommercialPostActivationInput = z.input<typeof inputSchema>;

type ActivationRecord = {
  onboardingId: string;
  commercialClientId: string;
  onboardingStatus: "pending" | "in_progress" | "blocked" | "completed" | "cancelled";
  clientStatus: "prospect" | "onboarding" | "active" | "suspended" | "closed";
  completedAt: Date | null;
  result: Record<string, unknown>;
};

type SchedulingStore = {
  transaction<T>(callback: (tx: {
    findActivation(onboardingId: string): Promise<ActivationRecord | null>;
    savePlan(onboardingId: string, result: Record<string, unknown>, updatedAt: Date): Promise<void>;
    emit(input: {
      aggregateId: string;
      dedupeKey: string;
      payload: Record<string, unknown>;
    }): Promise<boolean>;
  }) => Promise<T>): Promise<T>;
};

export type ScheduleCommercialPostActivationResult =
  | {
      ok: true;
      replayed: boolean;
      onboardingId: string;
      planKey: string;
      supportWindowEndsAt: string;
      milestoneCount: number;
      emittedEvents: string[];
    }
  | {
      ok: false;
      error: "invalid_input" | "onboarding_not_found" | "activation_not_available";
      message: string;
    };

export async function scheduleCommercialPostActivation(
  rawInput: ScheduleCommercialPostActivationInput,
  options: { store?: SchedulingStore; now?: () => Date } = {},
): Promise<ScheduleCommercialPostActivationResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const input = parsed.data;
  const store = options.store ?? createDrizzleSchedulingStore();
  const now = options.now?.() ?? new Date();

  return store.transaction(async (tx) => {
    const activation = await tx.findActivation(input.onboardingId);
    if (!activation) {
      return { ok: false, error: "onboarding_not_found", message: "O onboarding informado não foi encontrado." };
    }
    if (
      activation.onboardingStatus !== "completed"
      || activation.clientStatus !== "active"
      || !activation.completedAt
    ) {
      return {
        ok: false,
        error: "activation_not_available",
        message: "O acompanhamento exige onboarding concluído e cliente ativo.",
      };
    }

    const plan = buildCommercialPostActivationFollowUp({
      onboardingId: activation.onboardingId,
      commercialClientId: activation.commercialClientId,
      companyId: input.companyId,
      activatedAt: activation.completedAt.toISOString(),
      context: input.context,
    });
    if (!plan) return { ok: false, error: "invalid_input", message: "Não foi possível gerar o plano." };

    const existing = activation.result.postActivationFollowUpPlan;
    if (existing && typeof existing === "object" && (existing as { key?: unknown }).key === plan.key) {
      return {
        ok: true,
        replayed: true,
        onboardingId: input.onboardingId,
        planKey: plan.key,
        supportWindowEndsAt: plan.supportWindowEndsAt,
        milestoneCount: plan.milestones.length,
        emittedEvents: [],
      };
    }

    await tx.savePlan(input.onboardingId, {
      ...activation.result,
      postActivationFollowUpPlan: plan,
    }, now);
    const emitted = await tx.emit({
      aggregateId: input.onboardingId,
      dedupeKey: `commercial.post_activation.follow_up_scheduled:${plan.key}`,
      payload: { plan, scheduledBy: input.scheduledBy, scheduledAt: now.toISOString() },
    });

    return {
      ok: true,
      replayed: false,
      onboardingId: input.onboardingId,
      planKey: plan.key,
      supportWindowEndsAt: plan.supportWindowEndsAt,
      milestoneCount: plan.milestones.length,
      emittedEvents: emitted ? ["commercial.post_activation.follow_up_scheduled"] : [],
    };
  });
}

function createDrizzleSchedulingStore(): SchedulingStore {
  const db = getDb();
  return {
    transaction: (callback) => db.transaction(async (databaseTx) => callback({
      async findActivation(onboardingId) {
        const rows = await databaseTx
          .select({
            onboardingId: commercialOnboardings.id,
            commercialClientId: commercialOnboardings.commercialClientId,
            onboardingStatus: commercialOnboardings.status,
            clientStatus: commercialClients.status,
            completedAt: commercialOnboardings.completedAt,
            result: commercialOnboardings.result,
          })
          .from(commercialOnboardings)
          .innerJoin(commercialClients, eq(commercialClients.id, commercialOnboardings.commercialClientId))
          .where(eq(commercialOnboardings.id, onboardingId))
          .limit(1)
          .for("update");
        const row = rows[0];
        return row ? { ...row, result: (row.result ?? {}) as Record<string, unknown> } : null;
      },
      async savePlan(onboardingId, result, updatedAt) {
        await databaseTx.update(commercialOnboardings)
          .set({ result, updatedAt })
          .where(eq(commercialOnboardings.id, onboardingId));
      },
      async emit(value) {
        const rows = await databaseTx.insert(outbox).values({
          aggregateType: "commercial_onboarding",
          aggregateId: value.aggregateId,
          eventType: "commercial.post_activation.follow_up_scheduled",
          dedupeKey: value.dedupeKey,
          payload: value.payload,
        }).onConflictDoNothing().returning({ id: outbox.id });
        return Boolean(rows[0]);
      },
    })),
  };
}
