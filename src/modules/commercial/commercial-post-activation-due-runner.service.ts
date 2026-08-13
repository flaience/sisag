import { eq } from "drizzle-orm";
import { z } from "zod";

import { commercialOnboardings } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import { processCommercialPostActivationMilestone } from "./commercial-post-activation-milestone-processing.service";

const inputSchema = z.object({
  limit: z.number().int().positive().max(100).default(25),
});

const milestoneSchema = z.object({
  code: z.string().trim().min(1).max(100),
  dueAt: z.string().datetime(),
});

const planSchema = z.object({
  onboardingId: z.string().uuid(),
  milestones: z.array(milestoneSchema).min(1).max(100),
});

const executionSchema = z.object({
  milestoneCode: z.string().trim().min(1).max(100),
});

type DueCandidate = {
  onboardingId: string;
  result: Record<string, unknown>;
};

type DueRunnerStore = {
  listCompleted(limit: number): Promise<DueCandidate[]>;
};

type ObservationCollector = (input: {
  onboardingId: string;
  milestoneCode: string;
}) => Promise<Record<string, boolean>>;

type MilestoneProcessor = typeof processCommercialPostActivationMilestone;

export type RunCommercialPostActivationDueMilestonesInput = {
  limit?: number;
};

export type RunCommercialPostActivationDueMilestonesResult =
  | { ok: false; error: "invalid_input"; message: string }
  | {
      ok: true;
      scanned: number;
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
  const collectObservations = options.collectObservations ?? (async () => ({}));
  const process = options.process ?? processCommercialPostActivationMilestone;
  const now = options.now?.() ?? new Date();
  const candidates = await store.listCompleted(parsed.data.limit);
  const summary = {
    ok: true as const,
    scanned: candidates.length,
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
      const observations = await collectObservations({
        onboardingId: candidate.onboardingId,
        milestoneCode: dueMilestone.code,
      });
      const result = await process({
        onboardingId: candidate.onboardingId,
        observations,
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
  return milestone;
}

function createDrizzleDueRunnerStore(): DueRunnerStore {
  const db = getDb();
  return {
    async listCompleted(limit) {
      const rows = await db.select({
        onboardingId: commercialOnboardings.id,
        result: commercialOnboardings.result,
      }).from(commercialOnboardings)
        .where(eq(commercialOnboardings.status, "completed"))
        .limit(limit);
      return rows.map((row) => ({
        onboardingId: row.onboardingId,
        result: (row.result ?? {}) as Record<string, unknown>,
      }));
    },
  };
}
