import { eq } from "drizzle-orm";
import { z } from "zod";

import { commercialOnboardings } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

const milestoneCodeSchema = z.enum([
  "welcome",
  "adoption_d1",
  "adoption_d3",
  "adoption_d7",
  "assisted_support_close_d14",
]);

export const commercialPostActivationObservationSchema = z.object({
  idempotencyKey: z.string().trim().min(1).max(200),
  milestoneCode: milestoneCodeSchema,
  indicator: z.string().trim().min(1).max(100).regex(/^[a-z0-9][a-z0-9_]*$/),
  value: z.boolean(),
  observedAt: z.string().datetime(),
  source: z.object({
    type: z.enum(["system", "agent", "human"]),
    id: z.string().trim().min(1).max(200),
  }),
});

const inputSchema = z.object({
  onboardingId: z.string().uuid(),
  observation: commercialPostActivationObservationSchema,
});

const planSchema = z.object({
  onboardingId: z.string().uuid(),
  milestones: z.array(z.object({ code: milestoneCodeSchema })).min(1),
});

export type RecordCommercialPostActivationObservationInput = z.input<typeof inputSchema>;
type Observation = z.output<typeof commercialPostActivationObservationSchema>;

type ObservationRecord = {
  onboardingId: string;
  status: string;
  result: Record<string, unknown>;
};

type ObservationStore = {
  transaction<T>(callback: (tx: {
    findOnboarding(onboardingId: string): Promise<ObservationRecord | null>;
    saveResult(onboardingId: string, result: Record<string, unknown>, updatedAt: Date): Promise<void>;
  }) => Promise<T>): Promise<T>;
};

export type RecordCommercialPostActivationObservationResult =
  | {
      ok: true;
      replayed: boolean;
      onboardingId: string;
      milestoneCode: Observation["milestoneCode"];
      indicator: string;
      observationCount: number;
    }
  | {
      ok: false;
      error:
        | "invalid_input"
        | "onboarding_not_found"
        | "post_activation_not_available"
        | "milestone_not_found"
        | "observation_conflict"
        | "invalid_observation_history";
      message: string;
    };

export async function recordCommercialPostActivationObservation(
  rawInput: RecordCommercialPostActivationObservationInput,
  options: { store?: ObservationStore; now?: () => Date } = {},
): Promise<RecordCommercialPostActivationObservationResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "Observação pós-ativação inválida.",
    };
  }

  const input = parsed.data;
  const store = options.store ?? createDrizzleObservationStore();
  const now = options.now?.() ?? new Date();

  return store.transaction(async (tx) => {
    const onboarding = await tx.findOnboarding(input.onboardingId);
    if (!onboarding) {
      return { ok: false, error: "onboarding_not_found", message: "O onboarding informado não foi encontrado." };
    }
    if (onboarding.status !== "completed") {
      return { ok: false, error: "post_activation_not_available", message: "O acompanhamento pós-ativação ainda não está disponível." };
    }

    const plan = planSchema.safeParse(onboarding.result.postActivationFollowUpPlan);
    if (!plan.success || plan.data.onboardingId !== input.onboardingId) {
      return { ok: false, error: "post_activation_not_available", message: "O acompanhamento pós-ativação ainda não está disponível." };
    }
    if (!plan.data.milestones.some((item) => item.code === input.observation.milestoneCode)) {
      return { ok: false, error: "milestone_not_found", message: "O marco informado não pertence ao acompanhamento." };
    }

    const saved = z.array(commercialPostActivationObservationSchema).max(1000)
      .safeParse(onboarding.result.postActivationObservations ?? []);
    if (!saved.success) {
      return { ok: false, error: "invalid_observation_history", message: "O histórico de observações pós-ativação é inválido." };
    }

    const existing = saved.data.find(
      (item) => item.idempotencyKey === input.observation.idempotencyKey,
    );
    if (existing) {
      if (!semanticallyEqual(existing, input.observation)) {
        return { ok: false, error: "observation_conflict", message: "A chave de idempotência já foi usada por outra observação." };
      }
      return {
        ok: true,
        replayed: true,
        onboardingId: input.onboardingId,
        milestoneCode: input.observation.milestoneCode,
        indicator: input.observation.indicator,
        observationCount: saved.data.length,
      };
    }

    const observations = [...saved.data, input.observation];
    await tx.saveResult(input.onboardingId, {
      ...onboarding.result,
      postActivationObservations: observations,
    }, now);

    return {
      ok: true,
      replayed: false,
      onboardingId: input.onboardingId,
      milestoneCode: input.observation.milestoneCode,
      indicator: input.observation.indicator,
      observationCount: observations.length,
    };
  });
}

function semanticallyEqual(left: Observation, right: Observation) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function createDrizzleObservationStore(): ObservationStore {
  const db = getDb();
  return {
    transaction: (callback) => db.transaction(async (databaseTx) => callback({
      async findOnboarding(onboardingId) {
        const rows = await databaseTx.select({
          onboardingId: commercialOnboardings.id,
          status: commercialOnboardings.status,
          result: commercialOnboardings.result,
        }).from(commercialOnboardings)
          .where(eq(commercialOnboardings.id, onboardingId))
          .limit(1)
          .for("update");
        const row = rows[0];
        return row ? { ...row, result: (row.result ?? {}) as Record<string, unknown> } : null;
      },
      async saveResult(onboardingId, result, updatedAt) {
        await databaseTx.update(commercialOnboardings)
          .set({ result, updatedAt })
          .where(eq(commercialOnboardings.id, onboardingId));
      },
    })),
  };
}
