import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { commercialPostActivationRunnerRuns } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

const inputSchema = z.object({
  limit: z.number().int().min(1).max(200).default(96),
});

const projectionSchema = z.object({
  scanned: z.number().int().nonnegative(),
  cursor: z.string().uuid().nullable(),
  wrapped: z.boolean(),
  synchronized: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  created: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  preserved: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  failures: z.array(z.unknown()),
});

const observationSchema = z.object({
  executedAt: z.string().datetime(),
  projectionAudit: z.object({
    matched: z.boolean(),
    status: z.enum(["healthy", "degraded"]),
    differences: z.array(z.string().trim().min(1).max(100)).max(20),
    projection: projectionSchema,
  }),
});

type AuditQueryStore = {
  list(limit: number): Promise<unknown[]>;
};

export const COMMERCIAL_POST_ACTIVATION_PROJECTION_MIN_OBSERVATIONS = 8;

export type QueryCommercialPostActivationProjectionAuditResult =
  | {
      ok: false;
      error: "invalid_input" | "invalid_history";
      message: string;
    }
  | {
      ok: true;
      data: {
        recordedAt: string;
        status: "collecting" | "ready" | "blocked";
        reasons: Array<
          | "divergence_detected"
          | "projection_failure_detected"
          | "insufficient_observations"
          | "no_completed_cursor_cycle"
          | "no_completed_work_observed"
        >;
        requiredObservations: number;
        observations: number;
        matched: number;
        divergent: number;
        matchRatePercent: number;
        firstObservedAt: string | null;
        lastObservedAt: string | null;
        wrappedObservations: number;
        projectionFailures: number;
        synchronized: number;
        completed: number;
        differences: Record<string, number>;
      };
    };

export async function queryCommercialPostActivationProjectionAudit(
  rawInput: unknown = {},
  options: {
    store?: AuditQueryStore;
    now?: () => Date;
    minObservations?: number;
  } = {},
): Promise<QueryCommercialPostActivationProjectionAuditResult> {
  const parsedInput = inputSchema.safeParse(rawInput);
  const minObservations = options.minObservations
    ?? COMMERCIAL_POST_ACTIVATION_PROJECTION_MIN_OBSERVATIONS;
  if (
    !parsedInput.success
    || !Number.isInteger(minObservations)
    || minObservations < 1
    || minObservations > 200
    || (parsedInput.success && parsedInput.data.limit < minObservations)
  ) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Parâmetros para auditoria da projeção pós-ativação inválidos.",
    };
  }

  const stored = await (options.store ?? createDrizzleAuditQueryStore())
    .list(parsedInput.data.limit);
  const parsedHistory = z.array(observationSchema).safeParse(stored);
  if (!parsedHistory.success) {
    return {
      ok: false,
      error: "invalid_history",
      message: "O histórico da auditoria de projeção está inconsistente.",
    };
  }

  const history = [...parsedHistory.data]
    .sort((left, right) => left.executedAt.localeCompare(right.executedAt));
  const observations = history.length;
  const matched = history.filter((item) => item.projectionAudit.matched).length;
  const divergent = observations - matched;
  const wrappedObservations = history.filter(
    (item) => item.projectionAudit.projection.wrapped,
  ).length;
  const projectionFailures = history.reduce(
    (total, item) => total + item.projectionAudit.projection.failed,
    0,
  );
  const synchronized = history.reduce(
    (total, item) => total + item.projectionAudit.projection.synchronized,
    0,
  );
  const completed = history.reduce(
    (total, item) => total + item.projectionAudit.projection.completed,
    0,
  );
  const differences = history.reduce<Record<string, number>>((result, item) => {
    for (const difference of new Set(item.projectionAudit.differences)) {
      result[difference] = (result[difference] ?? 0) + 1;
    }
    return result;
  }, {});
  const reasons: Array<
    | "divergence_detected"
    | "projection_failure_detected"
    | "insufficient_observations"
    | "no_completed_cursor_cycle"
    | "no_completed_work_observed"
  > = [];
  if (divergent > 0) reasons.push("divergence_detected");
  if (projectionFailures > 0) reasons.push("projection_failure_detected");
  if (observations < minObservations) reasons.push("insufficient_observations");
  if (wrappedObservations === 0) reasons.push("no_completed_cursor_cycle");
  if (completed === 0) reasons.push("no_completed_work_observed");
  const blocked = divergent > 0 || projectionFailures > 0;

  return {
    ok: true,
    data: {
      recordedAt: (options.now?.() ?? new Date()).toISOString(),
      status: blocked ? "blocked" : reasons.length === 0 ? "ready" : "collecting",
      reasons,
      requiredObservations: minObservations,
      observations,
      matched,
      divergent,
      matchRatePercent: observations === 0
        ? 0
        : Math.round((matched / observations) * 10000) / 100,
      firstObservedAt: history.at(0)?.executedAt ?? null,
      lastObservedAt: history.at(-1)?.executedAt ?? null,
      wrappedObservations,
      projectionFailures,
      synchronized,
      completed,
      differences,
    },
  };
}

function createDrizzleAuditQueryStore(): AuditQueryStore {
  const db = getDb();
  const table = commercialPostActivationRunnerRuns;
  return {
    async list(limit) {
      const rows = await db.select({
        executedAt: table.executedAt,
        summary: table.summary,
      }).from(table)
        .where(and(
          eq(table.runnerKey, "post_activation_due_runner"),
          sql`${table.summary} ? 'projectionAudit'`,
        ))
        .orderBy(desc(table.executedAt))
        .limit(limit);
      return rows.map((row) => ({
        executedAt: row.executedAt.toISOString(),
        projectionAudit: (row.summary as Record<string, unknown>).projectionAudit,
      }));
    },
  };
}
