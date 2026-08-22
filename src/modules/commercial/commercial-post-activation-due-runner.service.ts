import { and, asc, eq, gt, lte } from "drizzle-orm";
import { z } from "zod";

import { commercialOnboardings } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import { processCommercialPostActivationMilestone } from "./commercial-post-activation-milestone-processing.service";
import { collectCommercialPostActivationObservations } from "./commercial-post-activation-observation-collector.service";
import { readCommercialPostActivationOperationalSnapshot } from "./commercial-post-activation-operational-signals.adapter";
import { evaluateCommercialPostActivationOperationalSignals } from "./commercial-post-activation-operational-signals.service";

const inputSchema = z.object({
  limit: z.number().int().positive().max(100).default(25),
  cursor: z.string().uuid().optional(),
});

const milestoneSchema = z.object({
  code: z.string().trim().min(1).max(100),
  dueAt: z.string().datetime(),
});

const planSchema = z.object({
  onboardingId: z.string().uuid(),
  companyId: z.string().uuid(),
  activatedAt: z.string().datetime(),
  context: z.object({
    teamSize: z.number().int().positive().max(1000),
  }),
  milestones: z.array(milestoneSchema).min(1).max(100),
});

const executionSchema = z.object({
  milestoneCode: z.string().trim().min(1).max(100),
});

type DueCandidate = {
  onboardingId: string;
  result: Record<string, unknown>;
};

type DueCandidateBatch = {
  candidates: DueCandidate[];
  cursor: string | null;
  wrapped: boolean;
};

type DueRunnerStore = {
  listCompleted(limit: number, cursor?: string): Promise<DueCandidateBatch>;
};

type ObservationCollector = (input: {
  onboardingId: string;
  milestoneCode: string;
}) => Promise<Record<string, boolean>>;

type OperationalSignalCollector = (input: {
  companyId: string;
  activatedAt: string;
  milestoneCode: string;
  expectedTeamSize: number;
}) => Promise<Record<string, boolean>>;

type MilestoneProcessor = typeof processCommercialPostActivationMilestone;

export type RunCommercialPostActivationDueMilestonesInput = {
  limit?: number;
  cursor?: string;
};

export type RunCommercialPostActivationDueMilestonesResult =
  | { ok: false; error: "invalid_input"; message: string }
  | {
      ok: true;
      scanned: number;
      cursor: string | null;
      wrapped: boolean;
      due: number;
      processed: number;
      waiting: number;
      completed: number;
      escalated: number;
      plansCompleted: number;
      failed: number;
      failures: Array<{ onboardingId: string; error: string }>;
    };

export async function runCommercialPostActivationDueMilestones(
  rawInput: RunCommercialPostActivationDueMilestonesInput = {},
  options: {
    store?: DueRunnerStore;
    collectObservations?: ObservationCollector;
    collectOperationalSignals?: OperationalSignalCollector;
    process?: MilestoneProcessor;
    now?: () => Date;
  } = {},
): Promise<RunCommercialPostActivationDueMilestonesResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "Dados do lote inválidos.",
    };
  }

  const store = options.store ?? createDrizzleDueRunnerStore();
  const process = options.process ?? processCommercialPostActivationMilestone;
  const now = options.now?.() ?? new Date();
  const batch = await store.listCompleted(parsed.data.limit, parsed.data.cursor);
  const candidates = batch.candidates;
  const summary = {
    ok: true as const,
    scanned: candidates.length,
    cursor: batch.cursor,
    wrapped: batch.wrapped,
    due: 0,
    processed: 0,
    waiting: 0,
    completed: 0,
    escalated: 0,
    plansCompleted: 0,
    failed: 0,
    failures: [] as Array<{ onboardingId: string; error: string }>,
  };

  for (const candidate of candidates) {
    const dueMilestone = findDueMilestone(candidate, now);
    if (!dueMilestone) continue;
    summary.due += 1;

    try {
      let observations: Record<string, boolean>;
      if (options.collectObservations) {
        observations = await options.collectObservations({
          onboardingId: candidate.onboardingId,
          milestoneCode: dueMilestone.code,
        });
      } else {
        const collected = collectCommercialPostActivationObservations(
          candidate.result.postActivationObservations,
          dueMilestone.code,
        );
        if (collected.ok === false) throw new Error(collected.error);
        observations = collected.observations;
      }

      let operationalSignals: Record<string, boolean> = {};
      if (
        isOperationalMilestone(dueMilestone.code)
        && (options.collectOperationalSignals || !options.collectObservations)
      ) {
        const collectOperationalSignals = options.collectOperationalSignals
          ?? collectDefaultOperationalSignals;
        operationalSignals = await collectOperationalSignals({
          companyId: dueMilestone.plan.companyId,
          activatedAt: dueMilestone.plan.activatedAt,
          milestoneCode: dueMilestone.code,
          expectedTeamSize: dueMilestone.plan.context.teamSize,
        });
      }

      const result = await process({
        onboardingId: candidate.onboardingId,
        observations: { ...observations, ...operationalSignals },
      });
      if (result.ok === false) {
        summary.failed += 1;
        summary.failures.push({ onboardingId: candidate.onboardingId, error: result.error });
        continue;
      }

      summary.processed += 1;
      if (result.decision === "wait") summary.waiting += 1;
      if (result.decision === "completed") summary.completed += 1;
      if (result.decision === "human_escalation") summary.escalated += 1;
      if (result.decision === "plan_completed") summary.plansCompleted += 1;
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

function findDueMilestone(candidate: DueCandidate, now: Date) {
  const plan = planSchema.safeParse(candidate.result.postActivationFollowUpPlan);
  if (!plan.success || plan.data.onboardingId !== candidate.onboardingId) return null;

  const executions = z.array(executionSchema).max(100)
    .safeParse(candidate.result.postActivationMilestoneExecutions ?? []);
  if (!executions.success) return null;

  const processed = new Set(executions.data.map((item) => item.milestoneCode));
  const milestone = plan.data.milestones.find((item) => !processed.has(item.code));
  if (!milestone || new Date(milestone.dueAt).getTime() > now.getTime()) return null;
  return { ...milestone, plan: plan.data };
}

function isOperationalMilestone(milestoneCode: string) {
  return milestoneCode === "adoption_d1"
    || milestoneCode === "adoption_d3"
    || milestoneCode === "adoption_d7";
}

async function collectDefaultOperationalSignals(input: {
  companyId: string;
  activatedAt: string;
  milestoneCode: string;
  expectedTeamSize: number;
}) {
  const snapshot = await readCommercialPostActivationOperationalSnapshot({
    companyId: input.companyId,
    activatedAt: input.activatedAt,
  });
  if (snapshot.ok === false) throw new Error(snapshot.error);

  const evaluated = evaluateCommercialPostActivationOperationalSignals({
    milestoneCode: input.milestoneCode as
      | "adoption_d1"
      | "adoption_d3"
      | "adoption_d7",
    expectedTeamSize: input.expectedTeamSize,
    snapshot: snapshot.snapshot,
  });
  if (evaluated.ok === false) throw new Error(evaluated.error);
  return evaluated.signals;
}

function createDrizzleDueRunnerStore(): DueRunnerStore {
  const db = getDb();
  return {
    async listCompleted(limit, cursor) {
      const selection = {
        onboardingId: commercialOnboardings.id,
        result: commercialOnboardings.result,
      };
      const mapRows = (rows: Array<{
        onboardingId: string;
        result: unknown;
      }>): DueCandidate[] => rows.map((row) => ({
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
