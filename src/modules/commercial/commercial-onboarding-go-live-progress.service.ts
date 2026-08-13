import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { commercialOnboardingSteps, commercialOnboardings } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import {
  buildCommercialOnboardingGoLiveChecklist,
  commercialOnboardingGoLiveEvidenceSchema,
  evaluateCommercialOnboardingGoLive,
} from "./commercial-onboarding-go-live-validation.service";

const inputSchema = z.object({
  onboardingId: z.string().uuid(),
  evidence: commercialOnboardingGoLiveEvidenceSchema,
});

export type RecordCommercialOnboardingGoLiveProgressInput = z.input<typeof inputSchema>;

type GoLiveRecord = {
  id: string;
  status: "pending" | "in_progress" | "blocked" | "completed" | "skipped" | "cancelled";
  input: Record<string, unknown>;
};

type GoLiveStore = {
  transaction<T>(callback: (tx: {
    findGoLive(onboardingId: string): Promise<GoLiveRecord | null>;
    saveProgress(stepId: string, input: Record<string, unknown>, updatedAt: Date): Promise<void>;
  }) => Promise<T>): Promise<T>;
};

export type RecordCommercialOnboardingGoLiveProgressResult =
  | {
      ok: true;
      replayed: boolean;
      onboardingId: string;
      passedChecks: number;
      totalChecks: number;
      percentage: number;
      readyToComplete: boolean;
      missingChecks: string[];
      failedChecks: string[];
    }
  | {
      ok: false;
      error: "invalid_input" | "go_live_not_found" | "go_live_not_available";
      message: string;
    };

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

function semanticallyEqual(left: unknown, right: unknown) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

export async function recordCommercialOnboardingGoLiveProgress(
  rawInput: RecordCommercialOnboardingGoLiveProgressInput,
  options: { store?: GoLiveStore; now?: () => Date } = {},
): Promise<RecordCommercialOnboardingGoLiveProgressResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "Evidência de go-live inválida.",
    };
  }

  const input = parsed.data;
  const checklist = buildCommercialOnboardingGoLiveChecklist();
  const store = options.store ?? createDrizzleGoLiveStore();
  const now = options.now?.() ?? new Date();

  return store.transaction(async (tx) => {
    const goLive = await tx.findGoLive(input.onboardingId);
    if (!goLive) {
      return { ok: false, error: "go_live_not_found", message: "A etapa de go-live não foi encontrada." };
    }
    if (!["pending", "in_progress"].includes(goLive.status)) {
      return { ok: false, error: "go_live_not_available", message: "A etapa de go-live não aceita novas evidências." };
    }

    const saved = z.array(commercialOnboardingGoLiveEvidenceSchema)
      .safeParse(goLive.input.goLiveEvidence ?? []);
    const evidence = saved.success ? saved.data : [];
    const existingIndex = evidence.findIndex((item) => item.checkCode === input.evidence.checkCode);
    const existingEvidence = existingIndex >= 0 ? evidence[existingIndex] : undefined;
    const replayed = existingEvidence
      ? semanticallyEqual(existingEvidence, input.evidence)
      : false;

    if (!replayed) {
      if (existingIndex >= 0) evidence[existingIndex] = input.evidence;
      else evidence.push(input.evidence);
      await tx.saveProgress(goLive.id, {
        ...goLive.input,
        goLiveChecklistVersion: checklist.version,
        goLiveEvidence: evidence,
      }, now);
    }

    const evaluation = evaluateCommercialOnboardingGoLive(checklist, evidence);
    const missingChecks = evaluation.ready ? [] : evaluation.missingChecks;
    const failedChecks = evaluation.ready ? [] : evaluation.failedChecks;
    const passedChecks = checklist.checks.length - missingChecks.length - failedChecks.length;

    return {
      ok: true,
      replayed,
      onboardingId: input.onboardingId,
      passedChecks,
      totalChecks: checklist.checks.length,
      percentage: Math.round((passedChecks / checklist.checks.length) * 100),
      readyToComplete: evaluation.ready,
      missingChecks,
      failedChecks,
    };
  });
}

function createDrizzleGoLiveStore(): GoLiveStore {
  const db = getDb();
  return {
    transaction: (callback) => db.transaction(async (databaseTx) => callback({
      async findGoLive(onboardingId) {
        const onboardingRows = await databaseTx
          .select({ currentStepCode: commercialOnboardings.currentStepCode })
          .from(commercialOnboardings)
          .where(eq(commercialOnboardings.id, onboardingId))
          .limit(1)
          .for("update");
        if (onboardingRows[0]?.currentStepCode !== "go_live_validation") return null;

        const rows = await databaseTx
          .select({
            id: commercialOnboardingSteps.id,
            status: commercialOnboardingSteps.status,
            input: commercialOnboardingSteps.input,
          })
          .from(commercialOnboardingSteps)
          .where(and(
            eq(commercialOnboardingSteps.onboardingId, onboardingId),
            eq(commercialOnboardingSteps.code, "go_live_validation"),
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

