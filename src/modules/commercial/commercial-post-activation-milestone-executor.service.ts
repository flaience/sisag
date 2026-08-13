import { z } from "zod";

import {
  evaluateCommercialPostActivationMilestone,
  type CommercialPostActivationFollowUpPlan,
  type CommercialPostActivationMilestone,
} from "./commercial-post-activation-follow-up.service";

const executionSchema = z.object({
  milestoneCode: z.string().trim().min(1).max(100),
  outcome: z.enum(["completed", "escalated"]),
  processedAt: z.string().datetime(),
});

const inputSchema = z.object({
  plan: z.object({
    version: z.literal("2026-08-v1"),
    key: z.string().trim().min(1),
    onboardingId: z.string().uuid(),
    milestones: z.array(z.object({
      code: z.enum([
        "welcome",
        "adoption_d1",
        "adoption_d3",
        "adoption_d7",
        "assisted_support_close_d14",
      ]),
      title: z.string().trim().min(1),
      dueAt: z.string().datetime(),
      ownerType: z.enum(["agent", "human"]),
      required: z.literal(true),
      indicators: z.array(z.string().trim().min(1)),
      escalationTriggers: z.array(z.string().trim().min(1)),
    })).length(5),
  }),
  executions: z.array(executionSchema).max(100).default([]),
  observations: z.record(z.string(), z.boolean()).default({}),
});

export type ExecuteCommercialPostActivationMilestoneInput = {
  plan: CommercialPostActivationFollowUpPlan;
  executions?: z.input<typeof executionSchema>[];
  observations?: Record<string, boolean>;
};

type PreparedEvent = {
  eventType:
    | "commercial.post_activation.milestone_completed"
    | "commercial.post_activation.human_escalation_requested";
  dedupeKey: string;
  payload: Record<string, unknown>;
};

export type ExecuteCommercialPostActivationMilestoneResult =
  | { ok: false; error: "invalid_input"; message: string }
  | {
      ok: true;
      replayed: boolean;
      decision: "wait" | "completed" | "human_escalation" | "plan_completed";
      reason: string;
      milestone: { code: string; dueAt: string; ownerType: "agent" | "human" } | null;
      missingIndicators: string[];
      activeEscalations: string[];
      event: PreparedEvent | null;
    };

export function executeCommercialPostActivationMilestone(
  rawInput: ExecuteCommercialPostActivationMilestoneInput,
  options: { now?: () => Date } = {},
): ExecuteCommercialPostActivationMilestoneResult {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "Dados de execução inválidos.",
    };
  }

  const input = parsed.data;
  const now = options.now?.() ?? new Date();
  const processed = new Set(input.executions.map((item) => item.milestoneCode));
  const milestone = input.plan.milestones.find(
    (item) => !processed.has(item.code),
  ) as CommercialPostActivationMilestone | undefined;

  if (!milestone) {
    return {
      ok: true,
      replayed: true,
      decision: "plan_completed",
      reason: "Todos os marcos do acompanhamento pós-ativação já foram processados.",
      milestone: null,
      missingIndicators: [],
      activeEscalations: [],
      event: null,
    };
  }

  const selected = {
    code: milestone.code,
    dueAt: milestone.dueAt,
    ownerType: milestone.ownerType,
  };
  if (now.getTime() < new Date(milestone.dueAt).getTime()) {
    return {
      ok: true,
      replayed: false,
      decision: "wait",
      reason: "O próximo marco ainda não atingiu o horário programado.",
      milestone: selected,
      missingIndicators: [],
      activeEscalations: [],
      event: null,
    };
  }

  const evaluation = evaluateCommercialPostActivationMilestone(
    milestone,
    input.observations,
  );
  if (evaluation.requiresHumanEscalation) {
    return {
      ok: true,
      replayed: false,
      decision: "human_escalation",
      reason: "O marco possui gatilhos ativos e requer acompanhamento humano.",
      milestone: selected,
      missingIndicators: evaluation.missingIndicators,
      activeEscalations: evaluation.activeEscalations,
      event: {
        eventType: "commercial.post_activation.human_escalation_requested",
        dedupeKey: `commercial.post_activation.human_escalation_requested:${input.plan.key}:${milestone.code}`,
        payload: {
          onboardingId: input.plan.onboardingId,
          planKey: input.plan.key,
          milestoneCode: milestone.code,
          activeEscalations: evaluation.activeEscalations,
          missingIndicators: evaluation.missingIndicators,
          requestedAt: now.toISOString(),
        },
      },
    };
  }

  if (!evaluation.completed) {
    return {
      ok: true,
      replayed: false,
      decision: "wait",
      reason: "O marco aguarda os indicadores obrigatórios.",
      milestone: selected,
      missingIndicators: evaluation.missingIndicators,
      activeEscalations: [],
      event: null,
    };
  }

  return {
    ok: true,
    replayed: false,
    decision: "completed",
    reason: "Todos os indicadores do marco foram confirmados.",
    milestone: selected,
    missingIndicators: [],
    activeEscalations: [],
    event: {
      eventType: "commercial.post_activation.milestone_completed",
      dedupeKey: `commercial.post_activation.milestone_completed:${input.plan.key}:${milestone.code}`,
      payload: {
        onboardingId: input.plan.onboardingId,
        planKey: input.plan.key,
        milestoneCode: milestone.code,
        completedAt: now.toISOString(),
      },
    },
  };
}
