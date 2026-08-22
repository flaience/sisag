import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";

import { commercialPostActivationRunnerRuns } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import {
  projectCommercialPostActivationRunnerFairnessMetrics,
  type CommercialPostActivationRunnerFairnessMetrics,
} from "./commercial-post-activation-runner-fairness-metrics.service";

const inputSchema = z.object({
  runnerKey: z.string().trim().min(1).max(100)
    .regex(/^[a-z0-9][a-z0-9_-]*$/)
    .default("post_activation_due_runner"),
  executionKey: z.string().trim().min(1).max(200),
  executedAt: z.string().datetime(),
  cursor: z.string().uuid().nullable(),
  wrapped: z.boolean(),
  batchLimit: z.number().int().positive().max(1000),
  scanned: z.number().int().nonnegative(),
});

const fairnessSchema = z.object({
  cursor: z.string().uuid().nullable(),
  cursorAdvanced: z.boolean(),
  completedCycles: z.number().int().nonnegative(),
  lastCycleCompletedAt: z.string().datetime().nullable(),
  consecutiveSaturatedRunsWithoutAdvance: z.number().int().nonnegative(),
  status: z.enum(["healthy", "degraded", "critical"]),
  reasons: z.array(z.literal("saturated_without_cursor_advance")),
});

type FairnessStore = {
  findExecution(
    runnerKey: string,
    executionKey: string,
  ): Promise<{ fairness: unknown | null } | null>;
  findLatest(runnerKey: string): Promise<{ fairness: unknown } | null>;
  save(input: {
    runnerKey: string;
    executionKey: string;
    fairness: CommercialPostActivationRunnerFairnessMetrics;
    recordedAt: Date;
  }): Promise<boolean>;
};

type FairnessProjector =
  typeof projectCommercialPostActivationRunnerFairnessMetrics;

export type PersistCommercialPostActivationRunnerFairnessResult =
  | {
      ok: false;
      error:
        | "invalid_input"
        | "execution_not_found"
        | "invalid_stored_fairness"
        | "persistence_conflict";
      message: string;
    }
  | {
      ok: true;
      replayed: boolean;
      runnerKey: string;
      executionKey: string;
      fairness: CommercialPostActivationRunnerFairnessMetrics;
    };

export async function persistCommercialPostActivationRunnerFairness(
  rawInput: unknown,
  options: {
    store?: FairnessStore;
    project?: FairnessProjector;
    now?: () => Date;
  } = {},
): Promise<PersistCommercialPostActivationRunnerFairnessResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Dados para persistência da justiça do runner inválidos.",
    };
  }

  const input = parsed.data;
  const store = options.store ?? createDrizzleFairnessStore();
  const existing = await store.findExecution(input.runnerKey, input.executionKey);
  if (!existing) {
    return {
      ok: false,
      error: "execution_not_found",
      message: "A execução do runner não foi encontrada para registrar justiça.",
    };
  }
  if (existing.fairness !== null) {
    const stored = fairnessSchema.safeParse(existing.fairness);
    if (!stored.success) return invalidStoredFairness();
    return {
      ok: true,
      replayed: true,
      runnerKey: input.runnerKey,
      executionKey: input.executionKey,
      fairness: stored.data,
    };
  }

  const latest = await store.findLatest(input.runnerKey);
  const previous = latest ? fairnessSchema.safeParse(latest.fairness) : null;
  if (previous && !previous.success) return invalidStoredFairness();
  const projected = (options.project
    ?? projectCommercialPostActivationRunnerFairnessMetrics)({
    executedAt: input.executedAt,
    cursor: input.cursor,
    wrapped: input.wrapped,
    batchLimit: input.batchLimit,
    scanned: input.scanned,
    ...(previous?.success ? { previous: previous.data } : {}),
  });
  if (projected.ok === false) return projected;

  const saved = await store.save({
    runnerKey: input.runnerKey,
    executionKey: input.executionKey,
    fairness: projected.metrics,
    recordedAt: options.now?.() ?? new Date(),
  });
  if (!saved) {
    const concurrent = await store.findExecution(
      input.runnerKey,
      input.executionKey,
    );
    const concurrentFairness = fairnessSchema.safeParse(concurrent?.fairness);
    if (concurrentFairness.success) {
      return {
        ok: true,
        replayed: true,
        runnerKey: input.runnerKey,
        executionKey: input.executionKey,
        fairness: concurrentFairness.data,
      };
    }
    return {
      ok: false,
      error: "persistence_conflict",
      message: "Não foi possível confirmar as métricas de justiça do runner.",
    };
  }

  return {
    ok: true,
    replayed: false,
    runnerKey: input.runnerKey,
    executionKey: input.executionKey,
    fairness: projected.metrics,
  };
}

function invalidStoredFairness() {
  return {
    ok: false as const,
    error: "invalid_stored_fairness" as const,
    message: "As métricas de justiça persistidas são inválidas.",
  };
}

function createDrizzleFairnessStore(): FairnessStore {
  const db = getDb();
  return {
    async findExecution(runnerKey, executionKey) {
      const rows = await db.select({
        fairness: commercialPostActivationRunnerRuns.fairness,
      }).from(commercialPostActivationRunnerRuns).where(and(
        eq(commercialPostActivationRunnerRuns.runnerKey, runnerKey),
        eq(commercialPostActivationRunnerRuns.executionKey, executionKey),
      )).limit(1);
      return rows[0] ?? null;
    },
    async findLatest(runnerKey) {
      const rows = await db.select({
        fairness: commercialPostActivationRunnerRuns.fairness,
      }).from(commercialPostActivationRunnerRuns).where(and(
        eq(commercialPostActivationRunnerRuns.runnerKey, runnerKey),
        isNotNull(commercialPostActivationRunnerRuns.fairness),
      )).orderBy(desc(commercialPostActivationRunnerRuns.executedAt)).limit(1);
      return (rows[0] as { fairness: unknown } | undefined) ?? null;
    },
    async save(value) {
      const rows = await db.update(commercialPostActivationRunnerRuns).set({
        fairness: value.fairness,
        fairnessRecordedAt: value.recordedAt,
      }).where(and(
        eq(commercialPostActivationRunnerRuns.runnerKey, value.runnerKey),
        eq(commercialPostActivationRunnerRuns.executionKey, value.executionKey),
        isNull(commercialPostActivationRunnerRuns.fairness),
      )).returning({ id: commercialPostActivationRunnerRuns.id });
      return Boolean(rows[0]);
    },
  };
}
