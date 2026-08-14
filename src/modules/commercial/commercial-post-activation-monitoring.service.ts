import { z } from "zod";

import {
  evaluateCommercialPostActivationMilestone,
  type CommercialPostActivationMilestone,
} from "./commercial-post-activation-follow-up.service";
import { collectCommercialPostActivationObservations } from "./commercial-post-activation-observation-collector.service";

const milestoneCodeSchema = z.enum([
  "welcome",
  "adoption_d1",
  "adoption_d3",
  "adoption_d7",
  "assisted_support_close_d14",
]);

const milestoneSchema = z.object({
  code: milestoneCodeSchema,
  title: z.string().trim().min(1),
  dueAt: z.string().datetime(),
  ownerType: z.enum(["agent", "human"]),
  required: z.literal(true),
  indicators: z.array(z.string().trim().min(1)),
  escalationTriggers: z.array(z.string().trim().min(1)),
});

const planSchema = z.object({
  version: z.literal("2026-08-v1"),
  key: z.string().trim().min(1),
  onboardingId: z.string().uuid(),
  supportWindowEndsAt: z.string().datetime(),
  milestones: z.array(milestoneSchema).length(5),
});

const executionSchema = z.object({
  milestoneCode: milestoneCodeSchema,
  outcome: z.enum(["completed", "escalated"]),
  processedAt: z.string().datetime(),
});

const inputSchema = z.object({
  onboardingId: z.string().uuid(),
  result: z.record(z.string(), z.unknown()),
});

export type CommercialPostActivationMonitoringStatus =
  | "scheduled"
  | "waiting"
  | "overdue"
  | "escalated"
  | "completed";

export type BuildCommercialPostActivationMonitoringResult =
  | { ok: false; error: "invalid_input" | "follow_up_not_scheduled" | "invalid_follow_up_state"; message: string }
  | {
      ok: true;
      monitoring: {
        onboardingId: string;
        planKey: string;
        status: CommercialPostActivationMonitoringStatus;
        currentMilestone: {
          code: string;
          title: string;
          ownerType: "agent" | "human";
          dueAt: string;
        } | null;
        processedMilestones: number;
        completedMilestones: number;
        escalatedMilestones: number;
        totalMilestones: number;
        missingIndicators: string[];
        activeEscalations: string[];
        lastProcessedAt: string | null;
        supportWindowEndsAt: string;
        supportWindowExpired: boolean;
      };
    };

export function buildCommercialPostActivationMonitoring(
  rawInput: { onboardingId: string; result: Record<string, unknown> },
  options: { now?: () => Date } = {},
): BuildCommercialPostActivationMonitoringResult {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: "invalid_input", message: "Dados de monitoramento inválidos." };
  }

  const rawPlan = parsed.data.result.postActivationFollowUpPlan;
  if (!rawPlan) {
    return { ok: false, error: "follow_up_not_scheduled", message: "O acompanhamento pós-ativação ainda não foi agendado." };
  }
  const plan = planSchema.safeParse(rawPlan);
  const executions = z.array(executionSchema).max(100).safeParse(
    parsed.data.result.postActivationMilestoneExecutions ?? [],
  );
  if (!plan.success || !executions.success || plan.data.onboardingId !== parsed.data.onboardingId) {
    return { ok: false, error: "invalid_follow_up_state", message: "O acompanhamento pós-ativação possui estado inválido." };
  }

  const executedCodes = new Set(executions.data.map((item) => item.milestoneCode));
  if (
    executedCodes.size !== executions.data.length
    || executions.data.some((item) => !plan.data.milestones.some((milestone) => milestone.code === item.milestoneCode))
  ) {
    return { ok: false, error: "invalid_follow_up_state", message: "O histórico de marcos pós-ativação é inválido." };
  }

  const current = plan.data.milestones.find((milestone) => !executedCodes.has(milestone.code));
  const now = options.now?.() ?? new Date();
  const lastProcessedAt = executions.data
    .map((item) => item.processedAt)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;
  const base = {
    onboardingId: parsed.data.onboardingId,
    planKey: plan.data.key,
    processedMilestones: executions.data.length,
    completedMilestones: executions.data.filter((item) => item.outcome === "completed").length,
    escalatedMilestones: executions.data.filter((item) => item.outcome === "escalated").length,
    totalMilestones: plan.data.milestones.length,
    lastProcessedAt,
    supportWindowEndsAt: plan.data.supportWindowEndsAt,
    supportWindowExpired: now.getTime() > new Date(plan.data.supportWindowEndsAt).getTime(),
  };

  if (!current) {
    return {
      ok: true,
      monitoring: {
        ...base,
        status: executions.data.some((item) => item.outcome === "escalated") ? "escalated" : "completed",
        currentMilestone: null,
        missingIndicators: [],
        activeEscalations: [],
      },
    };
  }

  const collected = collectCommercialPostActivationObservations(
    parsed.data.result.postActivationObservations,
    current.code,
  );
  if (collected.ok === false) {
    return { ok: false, error: "invalid_follow_up_state", message: collected.message };
  }
  const evaluation = evaluateCommercialPostActivationMilestone(
    current as CommercialPostActivationMilestone,
    collected.observations,
  );
  const hasHistoricalEscalation = executions.data.some((item) => item.outcome === "escalated");
  const isDue = now.getTime() >= new Date(current.dueAt).getTime();
  const status: CommercialPostActivationMonitoringStatus = hasHistoricalEscalation
    || evaluation.activeEscalations.length > 0
    ? "escalated"
    : !isDue
      ? "scheduled"
      : collected.observationCount > 0
        ? "waiting"
        : "overdue";

  return {
    ok: true,
    monitoring: {
      ...base,
      status,
      currentMilestone: {
        code: current.code,
        title: current.title,
        ownerType: current.ownerType,
        dueAt: current.dueAt,
      },
      missingIndicators: evaluation.missingIndicators,
      activeEscalations: evaluation.activeEscalations,
    },
  };
}
