import { z } from "zod";

const runnerSummarySchema = z.object({
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

const runnerMetricsSchema = z.object({
  totalRuns: z.number().int().nonnegative(),
  successfulRuns: z.number().int().nonnegative(),
  failedRuns: z.number().int().nonnegative(),
  consecutiveFailedRuns: z.number().int().nonnegative(),
  lastRunAt: z.string().datetime(),
  lastSuccessfulRunAt: z.string().datetime().nullable(),
  lastFailureAt: z.string().datetime().nullable(),
  status: z.enum(["healthy", "degraded", "critical"]),
});

export type CommercialPostActivationRunnerSummary = z.input<
  typeof runnerSummarySchema
>;

export type CommercialPostActivationRunnerMetrics = z.output<
  typeof runnerMetricsSchema
>;

export type ProjectCommercialPostActivationRunnerMetricsResult =
  | {
      ok: false;
      error: "invalid_input";
      message: string;
    }
  | {
      ok: true;
      metrics: CommercialPostActivationRunnerMetrics;
    };

export function projectCommercialPostActivationRunnerMetrics(
  summaryInput: CommercialPostActivationRunnerSummary,
  previousInput?: CommercialPostActivationRunnerMetrics,
): ProjectCommercialPostActivationRunnerMetricsResult {
  const summary = runnerSummarySchema.safeParse(summaryInput);
  if (!summary.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: summary.error.issues[0]?.message ?? "Resumo do runner inválido.",
    };
  }

  const previous = previousInput
    ? runnerMetricsSchema.safeParse(previousInput)
    : null;
  if (previous && !previous.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: previous.error.issues[0]?.message ?? "Métricas anteriores inválidas.",
    };
  }

  const prior = previous?.data;
  const runFailed = summary.data.failed > 0;
  const consecutiveFailedRuns = runFailed
    ? (prior?.consecutiveFailedRuns ?? 0) + 1
    : 0;
  const status = consecutiveFailedRuns >= 3
    ? "critical" as const
    : consecutiveFailedRuns > 0
      ? "degraded" as const
      : "healthy" as const;

  return {
    ok: true,
    metrics: {
      totalRuns: (prior?.totalRuns ?? 0) + 1,
      successfulRuns: (prior?.successfulRuns ?? 0) + (runFailed ? 0 : 1),
      failedRuns: (prior?.failedRuns ?? 0) + (runFailed ? 1 : 0),
      consecutiveFailedRuns,
      lastRunAt: summary.data.executedAt,
      lastSuccessfulRunAt: runFailed
        ? prior?.lastSuccessfulRunAt ?? null
        : summary.data.executedAt,
      lastFailureAt: runFailed
        ? summary.data.executedAt
        : prior?.lastFailureAt ?? null,
      status,
    },
  };
}
