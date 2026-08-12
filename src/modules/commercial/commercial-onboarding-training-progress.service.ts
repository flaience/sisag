import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { commercialOnboardingSteps, commercialOnboardings } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import {
  buildCommercialOnboardingTrainingPlan,
  commercialOnboardingTrainingEvidenceSchema,
  evaluateCommercialOnboardingTraining,
} from "./commercial-onboarding-training.service";

const inputSchema = z.object({
  onboardingId: z.string().uuid(),
  context: z.object({
    businessType: z.string().trim().min(1).max(100),
    activeChannels: z.array(z.string().trim().min(1).max(32)).max(20),
    teamSize: z.number().int().positive().max(1000),
  }),
  evidence: commercialOnboardingTrainingEvidenceSchema,
});

export type RecordCommercialOnboardingTrainingProgressInput = z.input<
  typeof inputSchema
>;

type TrainingRecord = {
  id: string;
  status: "pending" | "in_progress" | "blocked" | "completed" | "skipped" | "cancelled";
  input: Record<string, unknown>;
};

type TrainingStore = {
  transaction<T>(callback: (tx: {
    findTraining(onboardingId: string): Promise<TrainingRecord | null>;
    saveProgress(stepId: string, input: Record<string, unknown>, updatedAt: Date): Promise<void>;
  }) => Promise<T>): Promise<T>;
};

export type RecordCommercialOnboardingTrainingProgressResult =
  | {
      ok: true;
      replayed: boolean;
      onboardingId: string;
      completedModules: number;
      totalModules: number;
      percentage: number;
      readyToComplete: boolean;
      missingModules: string[];
    }
  | {
      ok: false;
      error: "invalid_input" | "training_not_found" | "training_not_available";
      message: string;
    };

export async function recordCommercialOnboardingTrainingProgress(
  rawInput: RecordCommercialOnboardingTrainingProgressInput,
  options: { store?: TrainingStore; now?: () => Date } = {},
): Promise<RecordCommercialOnboardingTrainingProgressResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "Evidência de treinamento inválida.",
    };
  }

  const input = parsed.data;
  const plan = buildCommercialOnboardingTrainingPlan(input.context);
  if (!plan) {
    return { ok: false, error: "invalid_input", message: "Contexto de treinamento inválido." };
  }

  const store = options.store ?? createDrizzleTrainingStore();
  const now = options.now?.() ?? new Date();

  return store.transaction(async (tx) => {
    const training = await tx.findTraining(input.onboardingId);
    if (!training) {
      return { ok: false, error: "training_not_found", message: "A etapa de treinamento não foi encontrada." };
    }
    if (!['pending', 'in_progress'].includes(training.status)) {
      return { ok: false, error: "training_not_available", message: "A etapa de treinamento não aceita novas evidências." };
    }

    const saved = z.array(commercialOnboardingTrainingEvidenceSchema)
      .safeParse(training.input.trainingEvidence ?? []);
    const evidence = saved.success ? saved.data : [];
    const key = (item: typeof input.evidence) => `${item.moduleCode}:${item.completedBy.id}`;
    const evidenceKey = key(input.evidence);
    const existingIndex = evidence.findIndex((item) => key(item) === evidenceKey);
    const replayed = existingIndex >= 0 && JSON.stringify(evidence[existingIndex]) === JSON.stringify(input.evidence);

    if (!replayed) {
      if (existingIndex >= 0) evidence[existingIndex] = input.evidence;
      else evidence.push(input.evidence);
      await tx.saveProgress(training.id, {
        ...training.input,
        trainingPlanVersion: plan.version,
        trainingContext: plan.context,
        trainingEvidence: evidence,
      }, now);
    }

    const strongestEvidence = [...evidence]
      .sort((left, right) => right.score - left.score)
      .filter((item, index, values) =>
        values.findIndex((candidate) => candidate.moduleCode === item.moduleCode) === index,
      );
    const evaluation = evaluateCommercialOnboardingTraining(plan, strongestEvidence);
    const missingModules = evaluation.ready ? [] : evaluation.missingModules;
    const completedModules = plan.modules.length - missingModules.length;

    return {
      ok: true,
      replayed,
      onboardingId: input.onboardingId,
      completedModules,
      totalModules: plan.modules.length,
      percentage: Math.round((completedModules / plan.modules.length) * 100),
      readyToComplete: evaluation.ready,
      missingModules,
    };
  });
}

function createDrizzleTrainingStore(): TrainingStore {
  const db = getDb();
  return {
    transaction: (callback) => db.transaction(async (databaseTx) => callback({
      async findTraining(onboardingId) {
        const onboardingRows = await databaseTx
          .select({ currentStepCode: commercialOnboardings.currentStepCode })
          .from(commercialOnboardings)
          .where(eq(commercialOnboardings.id, onboardingId))
          .limit(1)
          .for("update");
        if (onboardingRows[0]?.currentStepCode !== "training") return null;

        const rows = await databaseTx
          .select({
            id: commercialOnboardingSteps.id,
            status: commercialOnboardingSteps.status,
            input: commercialOnboardingSteps.input,
          })
          .from(commercialOnboardingSteps)
          .where(and(
            eq(commercialOnboardingSteps.onboardingId, onboardingId),
            eq(commercialOnboardingSteps.code, "training"),
          ))
          .limit(1)
          .for("update");
        const row = rows[0];
        return row ? { ...row, input: (row.input ?? {}) as Record<string, unknown> } : null;
      },
      async saveProgress(stepId, input, updatedAt) {
        await databaseTx
          .update(commercialOnboardingSteps)
          .set({ input, updatedAt })
          .where(eq(commercialOnboardingSteps.id, stepId));
      },
    })),
  };
}
