import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { commercialPostActivationRunnerRuns } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import {
  projectCommercialPostActivationRunnerCapacityMetrics,
  type CommercialPostActivationRunnerCapacityMetrics,
} from "./commercial-post-activation-runner-capacity-metrics.service";

const inputSchema = z.object({
  runnerKey: z.string().trim().min(1).max(100)
    .regex(/^[a-z0-9][a-z0-9_-]*$/)
    .default("post_activation_due_runner"),
  executionKey: z.string().trim().min(1).max(200),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  scheduleIntervalSeconds: z.number().int().min(300).max(86400).default(900),
  targetDurationSeconds: z.number().int().min(30).max(3600).default(300),
  batchLimit: z.number().int().positive().max(1000),
  scanned: z.number().int().nonnegative(),
  due: z.number().int().nonnegative(),
  processed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
});

const capacitySchema = z.object({
  durationMilliseconds: z.number().nonnegative(),
  durationSeconds: z.number().nonnegative(),
  scheduleIntervalSeconds: z.number().int().positive(),
  targetDurationSeconds: z.number().int().positive(),
  batchLimit: z.number().int().positive(),
  scanned: z.number().int().nonnegative(),
  due: z.number().int().nonnegative(),
  processed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  batchUtilizationPercent: z.number().min(0).max(100),
  processedPerMinute: z.number().nonnegative().nullable(),
  possibleBacklog: z.boolean(),
  status: z.enum(["healthy", "degraded", "critical"]),
  reasons: z.array(z.enum([
    "batch_saturated",
    "duration_target_exceeded",
    "schedule_interval_exceeded",
  ])).max(3),
});

type CapacityStore = {
  find(runnerKey: string, executionKey: string): Promise<{ capacity: unknown | null } | null>;
  save(input: {
    runnerKey: string;
    executionKey: string;
    capacity: CommercialPostActivationRunnerCapacityMetrics;
    recordedAt: Date;
  }): Promise<boolean>;
};

type CapacityProjector = typeof projectCommercialPostActivationRunnerCapacityMetrics;

export type PersistCommercialPostActivationRunnerCapacityResult =
  | {
      ok: false;
      error:
        | "invalid_input"
        | "execution_not_found"
        | "invalid_stored_capacity"
        | "persistence_conflict";
      message: string;
    }
  | {
      ok: true;
      replayed: boolean;
      runnerKey: string;
      executionKey: string;
      capacity: CommercialPostActivationRunnerCapacityMetrics;
    };

export async function persistCommercialPostActivationRunnerCapacity(
  rawInput: unknown,
  options: {
    store?: CapacityStore;
    project?: CapacityProjector;
    now?: () => Date;
  } = {},
): Promise<PersistCommercialPostActivationRunnerCapacityResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Dados para persistência da capacidade do runner inválidos.",
    };
  }

  const input = parsed.data;
  const store = options.store ?? createDrizzleCapacityStore();
  const existing = await store.find(input.runnerKey, input.executionKey);
  if (!existing) {
    return {
      ok: false,
      error: "execution_not_found",
      message: "A execução do runner não foi encontrada para registrar capacidade.",
    };
  }
  if (existing.capacity !== null) {
    const stored = capacitySchema.safeParse(existing.capacity);
    if (!stored.success) {
      return {
        ok: false,
        error: "invalid_stored_capacity",
        message: "As métricas de capacidade persistidas são inválidas.",
      };
    }
    return {
      ok: true,
      replayed: true,
      runnerKey: input.runnerKey,
      executionKey: input.executionKey,
      capacity: stored.data as CommercialPostActivationRunnerCapacityMetrics,
    };
  }

  const projected = (options.project ?? projectCommercialPostActivationRunnerCapacityMetrics)({
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    scheduleIntervalSeconds: input.scheduleIntervalSeconds,
    targetDurationSeconds: input.targetDurationSeconds,
    batchLimit: input.batchLimit,
    scanned: input.scanned,
    due: input.due,
    processed: input.processed,
    failed: input.failed,
  });
  if (projected.ok === false) return projected;

  const saved = await store.save({
    runnerKey: input.runnerKey,
    executionKey: input.executionKey,
    capacity: projected.metrics,
    recordedAt: options.now?.() ?? new Date(),
  });
  if (!saved) {
    const concurrent = await store.find(input.runnerKey, input.executionKey);
    const concurrentCapacity = capacitySchema.safeParse(concurrent?.capacity);
    if (concurrentCapacity.success) {
      return {
        ok: true,
        replayed: true,
        runnerKey: input.runnerKey,
        executionKey: input.executionKey,
        capacity: concurrentCapacity.data as CommercialPostActivationRunnerCapacityMetrics,
      };
    }
    return {
      ok: false,
      error: "persistence_conflict",
      message: "Não foi possível confirmar as métricas de capacidade do runner.",
    };
  }
  return {
    ok: true,
    replayed: false,
    runnerKey: input.runnerKey,
    executionKey: input.executionKey,
    capacity: projected.metrics,
  };
}

function createDrizzleCapacityStore(): CapacityStore {
  const db = getDb();
  return {
    async find(runnerKey, executionKey) {
      const rows = await db.select({
        capacity: commercialPostActivationRunnerRuns.capacity,
      }).from(commercialPostActivationRunnerRuns).where(and(
        eq(commercialPostActivationRunnerRuns.runnerKey, runnerKey),
        eq(commercialPostActivationRunnerRuns.executionKey, executionKey),
      )).limit(1);
      return rows[0] ?? null;
    },
    async save(value) {
      const rows = await db.update(commercialPostActivationRunnerRuns).set({
        capacity: value.capacity,
        capacityRecordedAt: value.recordedAt,
      }).where(and(
        eq(commercialPostActivationRunnerRuns.runnerKey, value.runnerKey),
        eq(commercialPostActivationRunnerRuns.executionKey, value.executionKey),
        isNull(commercialPostActivationRunnerRuns.capacity),
      )).returning({ id: commercialPostActivationRunnerRuns.id });
      return Boolean(rows[0]);
    },
  };
}
