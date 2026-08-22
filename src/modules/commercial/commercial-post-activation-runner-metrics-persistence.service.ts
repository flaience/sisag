import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { commercialPostActivationRunnerRuns } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import {
  projectCommercialPostActivationRunnerMetrics,
  type CommercialPostActivationRunnerMetrics,
  type CommercialPostActivationRunnerSummary,
} from "./commercial-post-activation-runner-metrics.service";

const inputSchema = z.object({
  runnerKey: z.string().trim().min(1).max(100)
    .regex(/^[a-z0-9][a-z0-9_-]*$/)
    .default("post_activation_due_runner"),
  executionKey: z.string().trim().min(1).max(200),
  summary: z.object({
    executedAt: z.string().datetime(),
    cursor: z.string().uuid().nullable().optional(),
    wrapped: z.boolean().optional(),
    scanned: z.number().int().nonnegative(),
    due: z.number().int().nonnegative(),
    processed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
  }),
});

type StoredRun = {
  metrics: CommercialPostActivationRunnerMetrics;
};

type RunnerMetricsStore = {
  findByExecutionKey(executionKey: string): Promise<StoredRun | null>;
  findLatest(runnerKey: string): Promise<StoredRun | null>;
  save(input: {
    runnerKey: string;
    executionKey: string;
    summary: CommercialPostActivationRunnerSummary;
    metrics: CommercialPostActivationRunnerMetrics;
  }): Promise<boolean>;
};

export type PersistCommercialPostActivationRunnerMetricsInput = z.input<
  typeof inputSchema
>;

export type PersistCommercialPostActivationRunnerMetricsResult =
  | { ok: false; error: "invalid_input" | "persistence_conflict"; message: string }
  | {
      ok: true;
      replayed: boolean;
      runnerKey: string;
      executionKey: string;
      metrics: CommercialPostActivationRunnerMetrics;
    };

export async function persistCommercialPostActivationRunnerMetrics(
  rawInput: PersistCommercialPostActivationRunnerMetricsInput,
  options: { store?: RunnerMetricsStore } = {},
): Promise<PersistCommercialPostActivationRunnerMetricsResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "Métricas do runner inválidas.",
    };
  }

  const input = parsed.data;
  const store = options.store ?? createDrizzleRunnerMetricsStore();
  const existing = await store.findByExecutionKey(input.executionKey);
  if (existing) {
    return {
      ok: true,
      replayed: true,
      runnerKey: input.runnerKey,
      executionKey: input.executionKey,
      metrics: existing.metrics,
    };
  }

  const previous = await store.findLatest(input.runnerKey);
  const projected = projectCommercialPostActivationRunnerMetrics(
    input.summary,
    previous?.metrics,
  );
  if (projected.ok === false) return projected;

  const inserted = await store.save({
    runnerKey: input.runnerKey,
    executionKey: input.executionKey,
    summary: input.summary,
    metrics: projected.metrics,
  });
  if (inserted) {
    return {
      ok: true,
      replayed: false,
      runnerKey: input.runnerKey,
      executionKey: input.executionKey,
      metrics: projected.metrics,
    };
  }

  const concurrent = await store.findByExecutionKey(input.executionKey);
  if (concurrent) {
    return {
      ok: true,
      replayed: true,
      runnerKey: input.runnerKey,
      executionKey: input.executionKey,
      metrics: concurrent.metrics,
    };
  }

  return {
    ok: false,
    error: "persistence_conflict",
    message: "Não foi possível confirmar a persistência das métricas do runner.",
  };
}

function createDrizzleRunnerMetricsStore(): RunnerMetricsStore {
  const db = getDb();
  return {
    async findByExecutionKey(executionKey) {
      const rows = await db.select({
        metrics: commercialPostActivationRunnerRuns.metrics,
      }).from(commercialPostActivationRunnerRuns)
        .where(eq(commercialPostActivationRunnerRuns.executionKey, executionKey))
        .limit(1);
      return (rows[0] as StoredRun | undefined) ?? null;
    },
    async findLatest(runnerKey) {
      const rows = await db.select({
        metrics: commercialPostActivationRunnerRuns.metrics,
      }).from(commercialPostActivationRunnerRuns)
        .where(eq(commercialPostActivationRunnerRuns.runnerKey, runnerKey))
        .orderBy(desc(commercialPostActivationRunnerRuns.executedAt))
        .limit(1);
      return (rows[0] as StoredRun | undefined) ?? null;
    },
    async save(value) {
      const rows = await db.insert(commercialPostActivationRunnerRuns).values({
        runnerKey: value.runnerKey,
        executionKey: value.executionKey,
        summary: value.summary,
        metrics: value.metrics,
        executedAt: new Date(value.summary.executedAt),
      }).onConflictDoNothing().returning({ id: commercialPostActivationRunnerRuns.id });
      return Boolean(rows[0]);
    },
  };
}
