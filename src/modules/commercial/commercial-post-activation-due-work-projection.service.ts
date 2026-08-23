import { z } from "zod";

const milestoneSchema = z.object({
  code: z.string().trim().min(1).max(100)
    .regex(/^[a-z0-9][a-z0-9_]*$/),
  dueAt: z.string().datetime(),
});

const planSchema = z.object({
  onboardingId: z.string().uuid(),
  milestones: z.array(milestoneSchema).min(1).max(100),
}).passthrough();

const executionSchema = z.object({
  milestoneCode: z.string().trim().min(1).max(100),
  outcome: z.enum(["completed", "escalated"]),
  processedAt: z.string().datetime(),
});

const inputSchema = z.object({
  onboardingId: z.string().uuid(),
  plan: planSchema,
  executions: z.array(executionSchema).max(100).default([]),
});

export type CommercialPostActivationDueWorkProjectionItem = {
  onboardingId: string;
  milestoneCode: string;
  status: "scheduled" | "completed";
  dueAt: string;
  availableAt: string;
  priority: number;
  completedAt: string | null;
};

export type ProjectCommercialPostActivationDueWorkResult =
  | {
      ok: false;
      error: "invalid_input" | "invalid_plan_state";
      message: string;
    }
  | {
      ok: true;
      onboardingId: string;
      items: CommercialPostActivationDueWorkProjectionItem[];
    };

export function projectCommercialPostActivationDueWork(
  rawInput: unknown,
): ProjectCommercialPostActivationDueWorkResult {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Dados para projeção dos trabalhos pós-ativação inválidos.",
    };
  }

  const input = parsed.data;
  if (input.plan.onboardingId !== input.onboardingId) {
    return invalidPlanState();
  }

  const milestoneCodes = input.plan.milestones.map((item) => item.code);
  const executionCodes = input.executions.map((item) => item.milestoneCode);
  if (
    new Set(milestoneCodes).size !== milestoneCodes.length
    || new Set(executionCodes).size !== executionCodes.length
    || executionCodes.some((code) => !milestoneCodes.includes(code))
  ) {
    return invalidPlanState();
  }

  const executions = new Map(
    input.executions.map((execution) => [execution.milestoneCode, execution]),
  );
  const milestones = [...input.plan.milestones].sort((left, right) => {
    const byDueAt = new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime();
    return byDueAt || left.code.localeCompare(right.code);
  });

  return {
    ok: true,
    onboardingId: input.onboardingId,
    items: milestones.map((milestone, position) => {
      const execution = executions.get(milestone.code);
      return {
        onboardingId: input.onboardingId,
        milestoneCode: milestone.code,
        status: execution ? "completed" as const : "scheduled" as const,
        dueAt: milestone.dueAt,
        availableAt: milestone.dueAt,
        priority: 100 + position,
        completedAt: execution?.processedAt ?? null,
      };
    }),
  };
}

function invalidPlanState(): ProjectCommercialPostActivationDueWorkResult {
  return {
    ok: false,
    error: "invalid_plan_state",
    message: "O plano e o histórico pós-ativação são inconsistentes.",
  };
}
