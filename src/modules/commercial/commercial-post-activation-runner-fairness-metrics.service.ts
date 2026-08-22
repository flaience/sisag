import { z } from "zod";

const fairnessMetricsSchema = z.object({
  cursor: z.string().uuid().nullable(),
  cursorAdvanced: z.boolean(),
  completedCycles: z.number().int().nonnegative(),
  lastCycleCompletedAt: z.string().datetime().nullable(),
  consecutiveSaturatedRunsWithoutAdvance: z.number().int().nonnegative(),
  status: z.enum(["healthy", "degraded", "critical"]),
  reasons: z.array(z.literal("saturated_without_cursor_advance")),
});

const inputSchema = z.object({
  executedAt: z.string().datetime(),
  cursor: z.string().uuid().nullable(),
  wrapped: z.boolean(),
  batchLimit: z.number().int().positive().max(1000),
  scanned: z.number().int().nonnegative(),
  previous: fairnessMetricsSchema.optional(),
}).superRefine((input, context) => {
  if (input.scanned > input.batchLimit) {
    context.addIssue({
      code: "custom",
      path: ["scanned"],
      message: "invalid_scanned",
    });
  }
  if (input.scanned > 0 && input.cursor === null) {
    context.addIssue({
      code: "custom",
      path: ["cursor"],
      message: "missing_cursor",
    });
  }
});

export type CommercialPostActivationRunnerFairnessMetrics = z.output<
  typeof fairnessMetricsSchema
>;

export type ProjectCommercialPostActivationRunnerFairnessMetricsResult =
  | {
      ok: false;
      error: "invalid_input";
      message: string;
    }
  | {
      ok: true;
      metrics: CommercialPostActivationRunnerFairnessMetrics;
    };

export function projectCommercialPostActivationRunnerFairnessMetrics(
  rawInput: unknown,
): ProjectCommercialPostActivationRunnerFairnessMetricsResult {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Dados de justiça do runner pós-ativação inválidos.",
    };
  }

  const input = parsed.data;
  const previous = input.previous;
  const cursorAdvanced = input.scanned > 0
    && input.cursor !== (previous?.cursor ?? null);
  const saturatedWithoutAdvance = input.scanned === input.batchLimit
    && !cursorAdvanced
    && !input.wrapped;
  const consecutiveSaturatedRunsWithoutAdvance = saturatedWithoutAdvance
    ? (previous?.consecutiveSaturatedRunsWithoutAdvance ?? 0) + 1
    : 0;
  const completedCycles = (previous?.completedCycles ?? 0)
    + (input.wrapped ? 1 : 0);
  const reasons = saturatedWithoutAdvance
    ? ["saturated_without_cursor_advance" as const]
    : [];
  const status = consecutiveSaturatedRunsWithoutAdvance >= 3
    ? "critical" as const
    : consecutiveSaturatedRunsWithoutAdvance > 0
      ? "degraded" as const
      : "healthy" as const;

  return {
    ok: true,
    metrics: {
      cursor: input.cursor,
      cursorAdvanced,
      completedCycles,
      lastCycleCompletedAt: input.wrapped
        ? input.executedAt
        : previous?.lastCycleCompletedAt ?? null,
      consecutiveSaturatedRunsWithoutAdvance,
      status,
      reasons,
    },
  };
}
