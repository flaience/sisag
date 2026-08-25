import { and, asc, desc, eq, gt, lte, sql } from "drizzle-orm";
import { z } from "zod";

import { commercialOnboardings, commercialPostActivationRunnerRuns } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import { synchronizeCommercialPostActivationDueWork } from "./commercial-post-activation-due-work-persistence.service";

const inputSchema = z.object({
  limit: z.number().int().positive().max(100).default(25),
  cursor: z.string().uuid().optional(),
});

type ProjectionCandidate = {
  onboardingId: string;
  result: Record<string, unknown>;
};

type ProjectionCandidateBatch = {
  candidates: ProjectionCandidate[];
  cursor: string | null;
  wrapped: boolean;
};

type ProjectionRunnerStore = {
  findCursor(): Promise<string | null>;
  listCompleted(limit: number, cursor?: string): Promise<ProjectionCandidateBatch>;
};

type DueWorkSynchronizer = typeof synchronizeCommercialPostActivationDueWork;

export type ProjectCommercialPostActivationDueWorkInput = {
  limit?: number;
  cursor?: string;
};

export type ProjectCommercialPostActivationDueWorkResult =
  | { ok: false; error: "invalid_input"; message: string }
  | {
      ok: true;
      scanned: number;
      cursor: string | null;
      wrapped: boolean;
      synchronized: number;
      failed: number;
      created: number;
      updated: number;
      preserved: number;
      completed: number;
      failures: Array<{ onboardingId: string; error: string }>;
    };

export async function projectCommercialPostActivationDueWork(
  rawInput: ProjectCommercialPostActivationDueWorkInput = {},
  options: {
    store?: ProjectionRunnerStore;
    synchronizeDueWork?: DueWorkSynchronizer;
  } = {},
): Promise<ProjectCommercialPostActivationDueWorkResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "Dados da projeção inválidos.",
    };
  }

  const store = options.store ?? createDrizzleProjectionRunnerStore();
  const synchronizeDueWork = options.synchronizeDueWork
    ?? synchronizeCommercialPostActivationDueWork;
  const cursor = parsed.data.cursor ?? await store.findCursor();
  const batch = await store.listCompleted(parsed.data.limit, cursor ?? undefined);
  const summary = {
    ok: true as const,
    scanned: batch.candidates.length,
    cursor: batch.cursor,
    wrapped: batch.wrapped,
    synchronized: 0,
    failed: 0,
    created: 0,
    updated: 0,
    preserved: 0,
    completed: 0,
    failures: [] as Array<{ onboardingId: string; error: string }>,
  };

  for (const candidate of batch.candidates) {
    try {
      const result = await synchronizeDueWork({
        onboardingId: candidate.onboardingId,
        plan: candidate.result.postActivationFollowUpPlan,
        executions: candidate.result.postActivationMilestoneExecutions ?? [],
      });
      if (result.ok === false) {
        summary.failed += 1;
        summary.failures.push({
          onboardingId: candidate.onboardingId,
          error: result.error,
        });
        continue;
      }
      summary.synchronized += 1;
      summary.created += result.created;
      summary.updated += result.updated;
      summary.preserved += result.preserved;
      summary.completed += result.completed;
    } catch (error) {
      summary.failed += 1;
      summary.failures.push({
        onboardingId: candidate.onboardingId,
        error: error instanceof Error ? error.message : "unexpected_error",
      });
    }
  }

  return summary;
}

function createDrizzleProjectionRunnerStore(): ProjectionRunnerStore {
  const db = getDb();
  return {
    async findCursor() {
      const rows = await db.select({
        summary: commercialPostActivationRunnerRuns.summary,
      }).from(commercialPostActivationRunnerRuns)
        .where(and(
          eq(commercialPostActivationRunnerRuns.runnerKey, "post_activation_due_runner"),
          sql`${commercialPostActivationRunnerRuns.summary} ? 'cursor'`,
        ))
        .orderBy(desc(commercialPostActivationRunnerRuns.executedAt))
        .limit(1);
      if (!rows[0]) return null;
      const parsed = z.object({
        cursor: z.string().uuid().nullable().optional(),
      }).safeParse(rows[0].summary);
      if (!parsed.success) throw new Error("invalid_runner_cursor");
      return parsed.data.cursor ?? null;
    },
    async listCompleted(limit, cursor) {
      const selection = {
        onboardingId: commercialOnboardings.id,
        result: commercialOnboardings.result,
      };
      const mapRows = (rows: Array<{
        onboardingId: string;
        result: unknown;
      }>): ProjectionCandidate[] => rows.map((row) => ({
        onboardingId: row.onboardingId,
        result: (row.result ?? {}) as Record<string, unknown>,
      }));

      if (!cursor) {
        const rows = await db.select(selection).from(commercialOnboardings)
          .where(eq(commercialOnboardings.status, "completed"))
          .orderBy(asc(commercialOnboardings.id))
          .limit(limit);
        const candidates = mapRows(rows);
        return {
          candidates,
          cursor: candidates.at(-1)?.onboardingId ?? null,
          wrapped: false,
        };
      }

      const afterRows = await db.select(selection).from(commercialOnboardings)
        .where(and(
          eq(commercialOnboardings.status, "completed"),
          gt(commercialOnboardings.id, cursor),
        ))
        .orderBy(asc(commercialOnboardings.id))
        .limit(limit);
      const remaining = limit - afterRows.length;
      const wrappedRows = remaining > 0
        ? await db.select(selection).from(commercialOnboardings)
          .where(and(
            eq(commercialOnboardings.status, "completed"),
            lte(commercialOnboardings.id, cursor),
          ))
          .orderBy(asc(commercialOnboardings.id))
          .limit(remaining)
        : [];
      const candidates = mapRows([...afterRows, ...wrappedRows]);
      return {
        candidates,
        cursor: candidates.at(-1)?.onboardingId ?? cursor,
        wrapped: remaining > 0,
      };
    },
  };
}
