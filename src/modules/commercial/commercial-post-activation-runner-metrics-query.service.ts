import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { commercialPostActivationRunnerRuns } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import type {
  CommercialPostActivationRunnerMetrics,
  CommercialPostActivationRunnerSummary,
} from "./commercial-post-activation-runner-metrics.service";

const inputSchema = z.object({
  runnerKey: z.string().trim().min(1).max(100)
    .regex(/^[a-z0-9][a-z0-9_-]*$/)
    .default("post_activation_due_runner"),
});

const summarySchema = z.object({
  executedAt: z.string().datetime(),
  cursor: z.string().uuid().nullable().optional(),
  wrapped: z.boolean().optional(),
  scanned: z.number().int().nonnegative(),
  due: z.number().int().nonnegative(),
  processed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
}).superRefine((value, context) => {
  if (value.due > value.scanned) {
    context.addIssue({
      code: "custom",
      message: "A quantidade vencida não pode superar a quantidade verificada.",
    });
  }
  if (value.processed + value.failed > value.due) {
    context.addIssue({
      code: "custom",
      message: "Resultados processados e falhos não podem superar os vencidos.",
    });
  }
});

const metricsSchema = z.object({
  totalRuns: z.number().int().nonnegative(),
  successfulRuns: z.number().int().nonnegative(),
  failedRuns: z.number().int().nonnegative(),
  consecutiveFailedRuns: z.number().int().nonnegative(),
  lastRunAt: z.string().datetime(),
  lastSuccessfulRunAt: z.string().datetime().nullable(),
  lastFailureAt: z.string().datetime().nullable(),
  status: z.enum(["healthy", "degraded", "critical"]),
});

const storedRunSchema = z.object({
  runnerKey: z.string().trim().min(1).max(100)
    .regex(/^[a-z0-9][a-z0-9_-]*$/),
  executionKey: z.string().trim().min(1).max(200),
  summary: summarySchema,
  metrics: metricsSchema,
  executedAt: z.union([z.date(), z.string().datetime()]),
});

type StoredRun = {
  runnerKey: string;
  executionKey: string;
  summary: unknown;
  metrics: unknown;
  executedAt: Date | string;
};

type RunnerMetricsQueryStore = {
  findLatest(runnerKey: string): Promise<StoredRun | null>;
};

export type GetCommercialPostActivationRunnerMetricsInput = {
  runnerKey?: string;
};

export type CommercialPostActivationRunnerMetricsSnapshot = {
  runnerKey: string;
  executionKey: string;
  summary: CommercialPostActivationRunnerSummary;
  metrics: CommercialPostActivationRunnerMetrics;
  executedAt: string;
};

export type GetCommercialPostActivationRunnerMetricsResult =
  | {
      ok: false;
      error: "invalid_input" | "invalid_stored_run";
      message: string;
    }
  | {
      ok: true;
      data: CommercialPostActivationRunnerMetricsSnapshot | null;
    };

export async function getCommercialPostActivationRunnerMetrics(
  rawInput: GetCommercialPostActivationRunnerMetricsInput = {},
  options: { store?: RunnerMetricsQueryStore } = {},
): Promise<GetCommercialPostActivationRunnerMetricsResult> {
  const input = inputSchema.safeParse(rawInput);
  if (!input.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: input.error.issues[0]?.message ?? "Consulta das métricas do runner inválida.",
    };
  }

  const stored = await (options.store ?? createDrizzleRunnerMetricsQueryStore())
    .findLatest(input.data.runnerKey);
  if (!stored) return { ok: true, data: null };

  const parsed = storedRunSchema.safeParse(stored);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_stored_run",
      message: "A execução persistida do runner é inválida.",
    };
  }

  return {
    ok: true,
    data: {
      runnerKey: parsed.data.runnerKey as string,
      executionKey: parsed.data.executionKey as string,
      summary: parsed.data.summary as CommercialPostActivationRunnerSummary,
      metrics: parsed.data.metrics as CommercialPostActivationRunnerMetrics,
      executedAt: parsed.data.executedAt instanceof Date
        ? parsed.data.executedAt.toISOString()
        : parsed.data.executedAt as string,
    },
  };
}

function createDrizzleRunnerMetricsQueryStore(): RunnerMetricsQueryStore {
  return {
    async findLatest(runnerKey) {
      const rows = await getDb().select({
        runnerKey: commercialPostActivationRunnerRuns.runnerKey,
        executionKey: commercialPostActivationRunnerRuns.executionKey,
        summary: commercialPostActivationRunnerRuns.summary,
        metrics: commercialPostActivationRunnerRuns.metrics,
        executedAt: commercialPostActivationRunnerRuns.executedAt,
      }).from(commercialPostActivationRunnerRuns)
        .where(eq(commercialPostActivationRunnerRuns.runnerKey, runnerKey))
        .orderBy(desc(commercialPostActivationRunnerRuns.executedAt))
        .limit(1);
      return (rows[0] as StoredRun | undefined) ?? null;
    },
  };
}
