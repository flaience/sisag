import { z } from "zod";

const inputSchema = z.object({
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  scheduleIntervalSeconds: z.number().int().min(300).max(86400).default(900),
  targetDurationSeconds: z.number().int().min(30).max(3600).default(300),
  batchLimit: z.number().int().positive().max(1000),
  scanned: z.number().int().nonnegative(),
  due: z.number().int().nonnegative(),
  processed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
}).superRefine((input, context) => {
  const startedAt = new Date(input.startedAt).getTime();
  const finishedAt = new Date(input.finishedAt).getTime();
  if (finishedAt < startedAt) {
    context.addIssue({ code: "custom", path: ["finishedAt"], message: "invalid_order" });
  }
  if (input.targetDurationSeconds >= input.scheduleIntervalSeconds) {
    context.addIssue({ code: "custom", path: ["targetDurationSeconds"], message: "invalid_target" });
  }
  if (input.scanned > input.batchLimit) {
    context.addIssue({ code: "custom", path: ["scanned"], message: "invalid_scanned" });
  }
  if (input.due > input.scanned) {
    context.addIssue({ code: "custom", path: ["due"], message: "invalid_due" });
  }
  if (input.processed > input.due) {
    context.addIssue({ code: "custom", path: ["processed"], message: "invalid_processed" });
  }
  if (input.failed > input.due - input.processed) {
    context.addIssue({ code: "custom", path: ["failed"], message: "invalid_failed" });
  }
});

export type CommercialPostActivationRunnerCapacityStatus =
  | "healthy"
  | "degraded"
  | "critical";

export type CommercialPostActivationRunnerCapacityReason =
  | "batch_saturated"
  | "duration_target_exceeded"
  | "schedule_interval_exceeded";

export type CommercialPostActivationRunnerCapacityMetrics = {
  durationMilliseconds: number;
  durationSeconds: number;
  scheduleIntervalSeconds: number;
  targetDurationSeconds: number;
  batchLimit: number;
  scanned: number;
  due: number;
  processed: number;
  failed: number;
  batchUtilizationPercent: number;
  processedPerMinute: number | null;
  possibleBacklog: boolean;
  status: CommercialPostActivationRunnerCapacityStatus;
  reasons: CommercialPostActivationRunnerCapacityReason[];
};

export type ProjectCommercialPostActivationRunnerCapacityMetricsResult =
  | {
      ok: false;
      error: "invalid_input";
      message: string;
    }
  | {
      ok: true;
      metrics: CommercialPostActivationRunnerCapacityMetrics;
    };

export function projectCommercialPostActivationRunnerCapacityMetrics(
  rawInput: unknown,
): ProjectCommercialPostActivationRunnerCapacityMetricsResult {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Dados de capacidade do runner pós-ativação inválidos.",
    };
  }

  const input = parsed.data;
  const durationMilliseconds = new Date(input.finishedAt).getTime()
    - new Date(input.startedAt).getTime();
  const durationSeconds = durationMilliseconds / 1000;
  const possibleBacklog = input.scanned === input.batchLimit;
  const targetExceeded = durationSeconds >= input.targetDurationSeconds;
  const intervalExceeded = durationSeconds >= input.scheduleIntervalSeconds;
  const reasons: CommercialPostActivationRunnerCapacityReason[] = [];
  if (possibleBacklog) reasons.push("batch_saturated");
  if (targetExceeded) reasons.push("duration_target_exceeded");
  if (intervalExceeded) reasons.push("schedule_interval_exceeded");

  const status: CommercialPostActivationRunnerCapacityStatus = intervalExceeded
    ? "critical"
    : possibleBacklog || targetExceeded
      ? "degraded"
      : "healthy";

  return {
    ok: true,
    metrics: {
      durationMilliseconds,
      durationSeconds,
      scheduleIntervalSeconds: input.scheduleIntervalSeconds,
      targetDurationSeconds: input.targetDurationSeconds,
      batchLimit: input.batchLimit,
      scanned: input.scanned,
      due: input.due,
      processed: input.processed,
      failed: input.failed,
      batchUtilizationPercent: round((input.scanned / input.batchLimit) * 100),
      processedPerMinute: durationMilliseconds === 0
        ? null
        : round(input.processed / (durationMilliseconds / 60000)),
      possibleBacklog,
      status,
      reasons,
    },
  };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
