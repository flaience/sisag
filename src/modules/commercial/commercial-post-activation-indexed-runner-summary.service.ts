import { z } from "zod";

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
  failures: z.array(z.object({
    onboardingId: z.string().uuid(),
    error: z.string().trim().min(1).max(200),
  })).max(100),
}).superRefine((value, context) => {
  if (value.synchronized + value.failed !== value.scanned) {
    context.addIssue({ code: "custom", message: "invalid_projection_coverage" });
  }
  if (value.failures.length !== value.failed) {
    context.addIssue({ code: "custom", message: "invalid_projection_failures" });
  }
});

const processingSchema = z.object({
  claimed: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  deferred: z.number().int().nonnegative(),
  escalated: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  settlementFailed: z.number().int().nonnegative(),
  status: z.enum(["healthy", "degraded"]),
}).superRefine((value, context) => {
  const accounted = value.completed + value.deferred + value.escalated
    + value.failed + value.settlementFailed;
  if (accounted !== value.claimed) {
    context.addIssue({ code: "custom", message: "invalid_processing_coverage" });
  }
  if ((value.status === "degraded") !== (value.settlementFailed > 0)) {
    context.addIssue({ code: "custom", message: "invalid_processing_status" });
  }
});

const recoverySchema = z.object({
  recovered: z.number().int().nonnegative(),
  retryable: z.number().int().nonnegative(),
  exhausted: z.number().int().nonnegative(),
}).superRefine((value, context) => {
  if (value.retryable + value.exhausted !== value.recovered) {
    context.addIssue({ code: "custom", message: "invalid_recovery_coverage" });
  }
});

const inputSchema = z.object({
  executedAt: z.string().datetime(),
  projection: projectionSchema,
  processing: processingSchema,
  recovery: recoverySchema,
});

export type CommercialPostActivationIndexedRunnerReason =
  | "projection_failure"
  | "processing_failure"
  | "settlement_failure"
  | "recovery_exhausted";

export type ComposeCommercialPostActivationIndexedRunnerSummaryResult =
  | { ok: false; error: "invalid_input"; message: string }
  | {
      ok: true;
      summary: {
        source: "indexed";
        executedAt: string;
        cursor: string | null;
        wrapped: boolean;
        scanned: number;
        due: number;
        processed: number;
        waiting: number;
        completed: number;
        escalated: number;
        plansCompleted: number;
        failed: number;
        failures: Array<{ onboardingId: string; error: string }>;
        dueWork: z.output<typeof projectionSchema>;
        recovery: z.output<typeof recoverySchema>;
        processing: z.output<typeof processingSchema>;
        projectionScanned: number;
        status: "healthy" | "degraded" | "critical";
        reasons: CommercialPostActivationIndexedRunnerReason[];
      };
    };

export function composeCommercialPostActivationIndexedRunnerSummary(
  rawInput: unknown,
): ComposeCommercialPostActivationIndexedRunnerSummaryResult {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Resumos do pipeline indexado pós-ativação inválidos.",
    };
  }

  const { executedAt, projection, processing, recovery } = parsed.data;
  const reasons: CommercialPostActivationIndexedRunnerReason[] = [];
  if (projection.failed > 0) reasons.push("projection_failure");
  if (processing.failed > 0) reasons.push("processing_failure");
  if (processing.settlementFailed > 0) reasons.push("settlement_failure");
  if (recovery.exhausted > 0) reasons.push("recovery_exhausted");
  const critical = projection.failed > 0 || processing.settlementFailed > 0;
  const failed = processing.failed + processing.settlementFailed;

  return {
    ok: true,
    summary: {
      source: "indexed",
      executedAt,
      cursor: projection.cursor,
      wrapped: projection.wrapped,
      scanned: processing.claimed,
      due: processing.claimed,
      processed: processing.completed + processing.deferred + processing.escalated,
      waiting: processing.deferred,
      completed: processing.completed,
      escalated: processing.escalated,
      plansCompleted: 0,
      failed,
      failures: projection.failures.map((failure) => {
        if (!failure.onboardingId || !failure.error) {
          throw new Error("invalid_validated_projection_failure");
        }
        return { onboardingId: failure.onboardingId, error: failure.error };
      }),
      dueWork: projection,
      recovery,
      processing,
      projectionScanned: projection.scanned,
      status: critical ? "critical" : reasons.length > 0 ? "degraded" : "healthy",
      reasons,
    },
  };
}
