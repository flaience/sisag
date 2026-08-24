import { eq } from "drizzle-orm";
import { z } from "zod";

import { commercialOnboardings } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import { processCommercialPostActivationMilestone } from "./commercial-post-activation-milestone-processing.service";
import { collectCommercialPostActivationObservations } from "./commercial-post-activation-observation-collector.service";
import { readCommercialPostActivationOperationalSnapshot } from "./commercial-post-activation-operational-signals.adapter";
import { evaluateCommercialPostActivationOperationalSignals } from "./commercial-post-activation-operational-signals.service";

const inputSchema = z.object({
  workId: z.string().uuid(),
  workerKey: z.string().trim().min(1).max(200)
    .regex(/^[A-Za-z0-9][A-Za-z0-9:._-]*$/),
  onboardingId: z.string().uuid(),
  milestoneCode: z.string().trim().min(1).max(100)
    .regex(/^[a-z0-9][a-z0-9_]*$/),
});

const planSchema = z.object({
  onboardingId: z.string().uuid(),
  companyId: z.string().uuid(),
  activatedAt: z.string().datetime(),
  context: z.object({ teamSize: z.number().int().positive().max(1000) }),
  milestones: z.array(z.object({ code: z.string() })).min(1).max(100),
});

type ExecutorStore = {
  find(onboardingId: string): Promise<Record<string, unknown> | null>;
};

type Processor = typeof processCommercialPostActivationMilestone;

type OperationalCollector = (input: {
  companyId: string;
  activatedAt: string;
  milestoneCode: "adoption_d1" | "adoption_d3" | "adoption_d7";
  expectedTeamSize: number;
}) => Promise<Record<string, boolean>>;

export type ExecuteCommercialPostActivationDueWorkResult =
  | {
      ok: false;
      error: "invalid_input" | "onboarding_not_found" | "invalid_follow_up_state" | "execution_rejected";
      message: string;
    }
  | {
      ok: true;
      workId: string;
      workerKey: string;
      onboardingId: string;
      milestoneCode: string;
      decision: "wait" | "completed" | "human_escalation" | "plan_completed";
      settlementOutcome: "completed" | "deferred";
      deferSeconds: number | null;
      replayed: boolean;
      missingIndicators: string[];
      activeEscalations: string[];
      emittedEvents: string[];
    };

export async function executeCommercialPostActivationDueWork(
  rawInput: unknown,
  options: {
    store?: ExecutorStore;
    process?: Processor;
    collectOperationalSignals?: OperationalCollector;
    deferSeconds?: number;
  } = {},
): Promise<ExecuteCommercialPostActivationDueWorkResult> {
  const parsed = inputSchema.safeParse(rawInput);
  const deferSeconds = options.deferSeconds ?? 900;
  if (!parsed.success || !Number.isInteger(deferSeconds) || deferSeconds < 30 || deferSeconds > 86400) {
    return { ok: false, error: "invalid_input", message: "Dados para execução do trabalho pós-ativação inválidos." };
  }

  const input = parsed.data;
  const result = await (options.store ?? createDrizzleExecutorStore()).find(input.onboardingId);
  if (!result) {
    return { ok: false, error: "onboarding_not_found", message: "O onboarding reivindicado não foi encontrado." };
  }

  const plan = planSchema.safeParse(result.postActivationFollowUpPlan);
  if (
    !plan.success
    || plan.data.onboardingId !== input.onboardingId
    || !plan.data.milestones.some((milestone) => milestone.code === input.milestoneCode)
  ) {
    return { ok: false, error: "invalid_follow_up_state", message: "O trabalho não corresponde ao plano pós-ativação." };
  }

  const collected = collectCommercialPostActivationObservations(
    result.postActivationObservations,
    input.milestoneCode,
  );
  if (collected.ok === false) {
    return { ok: false, error: "invalid_follow_up_state", message: collected.message };
  }

  let operationalSignals: Record<string, boolean> = {};
  if (isOperationalMilestone(input.milestoneCode)) {
    operationalSignals = await (options.collectOperationalSignals
      ?? collectDefaultOperationalSignals)({
      companyId: plan.data.companyId,
      activatedAt: plan.data.activatedAt,
      milestoneCode: input.milestoneCode,
      expectedTeamSize: plan.data.context.teamSize,
    });
  }

  const processed = await (options.process ?? processCommercialPostActivationMilestone)({
    onboardingId: input.onboardingId,
    expectedMilestoneCode: input.milestoneCode,
    observations: { ...collected.observations, ...operationalSignals },
  });
  if (processed.ok === false) {
    return { ok: false, error: "execution_rejected", message: processed.message };
  }

  const deferred = processed.decision === "wait";
  return {
    ok: true,
    workId: input.workId,
    workerKey: input.workerKey,
    onboardingId: input.onboardingId,
    milestoneCode: input.milestoneCode,
    decision: processed.decision,
    settlementOutcome: deferred ? "deferred" : "completed",
    deferSeconds: deferred ? deferSeconds : null,
    replayed: processed.replayed,
    missingIndicators: processed.missingIndicators,
    activeEscalations: processed.activeEscalations,
    emittedEvents: processed.emittedEvents,
  };
}

function isOperationalMilestone(
  code: string,
): code is "adoption_d1" | "adoption_d3" | "adoption_d7" {
  return code === "adoption_d1" || code === "adoption_d3" || code === "adoption_d7";
}

async function collectDefaultOperationalSignals(input: Parameters<OperationalCollector>[0]) {
  const snapshot = await readCommercialPostActivationOperationalSnapshot({
    companyId: input.companyId,
    activatedAt: input.activatedAt,
  });
  if (snapshot.ok === false) throw new Error(snapshot.error);
  const evaluated = evaluateCommercialPostActivationOperationalSignals({
    milestoneCode: input.milestoneCode,
    expectedTeamSize: input.expectedTeamSize,
    snapshot: snapshot.snapshot,
  });
  if (evaluated.ok === false) throw new Error(evaluated.error);
  return evaluated.signals;
}

function createDrizzleExecutorStore(): ExecutorStore {
  const db = getDb();
  return {
    async find(onboardingId) {
      const rows = await db.select({ result: commercialOnboardings.result })
        .from(commercialOnboardings)
        .where(eq(commercialOnboardings.id, onboardingId))
        .limit(1);
      return rows[0] ? (rows[0].result ?? {}) as Record<string, unknown> : null;
    },
  };
}
