import type { StableCoverage } from "./RecoveryRetrievalStableMetrics";
export const RECOVERY_RETRIEVAL_STABLE_HEALTH_POLICY = {
  version: "recovery_retrieval_stable_health_v2",
  minimumExecutions: 50, minimumBaselineExecutions: 50,
  minimumSuccessRate: 97, maximumFallbackRate: 3, maximumP95DurationMs: 2000,
  maximumAverageTokens: 5000, maximumSuccessRateDrop: 2, maximumFallbackRateIncrease: 2,
} as const;
export type RecoveryRetrievalStableHealthMetrics = {
  planId: string; candidateId: string; executions: number; successRate: number; fallbackRate: number;
  p95DurationMs: number | null; averageTokens: number | null; coverage: StableCoverage;
};
type Check = { code: string; passed: boolean | null; evaluated: boolean; actual: number | null; operator: "gte" | "lte"; threshold: number; severity: "degraded" | "critical"; baselineAvailable?: boolean };
const valid = (v: number | null) => v !== null && Number.isFinite(v) && v >= 0;
const reliable = (p: RecoveryRetrievalStableHealthMetrics) => Number.isInteger(p.executions) && p.executions > 0 &&
  p.coverage?.modes === p.executions && valid(p.successRate) && valid(p.fallbackRate) &&
  p.successRate <= 100 && p.fallbackRate <= 100 && Math.abs(p.successRate + p.fallbackRate - 100) <= .11;
export function evaluateRecoveryRetrievalStableHealth(input: {
  current: RecoveryRetrievalStableHealthMetrics[]; previous: RecoveryRetrievalStableHealthMetrics[]; complete: boolean;
}) {
  const policy = RECOVERY_RETRIEVAL_STABLE_HEALTH_POLICY;
  const complete = input.complete === true;
  return {
    policyVersion: policy.version, automaticAction: false, requiresHumanReview: true, complete,
    interpretation: "observational evidence requires human review",
    plans: input.current.map(plan => {
      const previous = input.previous.find(row => row.planId === plan.planId && row.candidateId === plan.candidateId);
      const baselineReason = !complete ? "incomplete_window" : !previous ? "missing" :
        previous.executions < policy.minimumBaselineExecutions ? "insufficient_sample" : !reliable(previous) ? "invalid_evidence" : null;
      const baselineAvailable = baselineReason === null;
      const modes = reliable(plan);
      const durations = plan.coverage?.durations === plan.executions && valid(plan.p95DurationMs);
      const tokens = plan.coverage?.tokens === plan.executions && valid(plan.averageTokens);
      const check = (code: string, actual: number | null, operator: "gte" | "lte", threshold: number, severity: "critical" | "degraded", available: boolean): Check => {
        const evaluated = complete && available && actual !== null && Number.isFinite(actual);
        return { code, actual: evaluated ? actual : null, evaluated, passed: evaluated ? (operator === "gte" ? actual! >= threshold : actual! <= threshold) : null, operator, threshold, severity };
      };
      const checks: Check[] = [
        check("success_rate", plan.successRate, "gte", policy.minimumSuccessRate, "critical", modes),
        check("fallback_rate", plan.fallbackRate, "lte", policy.maximumFallbackRate, "critical", modes),
        check("p95_duration_ms", plan.p95DurationMs, "lte", policy.maximumP95DurationMs, "degraded", durations),
        check("average_tokens", plan.averageTokens, "lte", policy.maximumAverageTokens, "degraded", tokens),
        { ...check("success_rate_drop", previous ? Number((previous.successRate - plan.successRate).toFixed(1)) : null, "lte", policy.maximumSuccessRateDrop, "critical", baselineAvailable && modes), baselineAvailable },
        { ...check("fallback_rate_increase", previous ? Number((plan.fallbackRate - previous.fallbackRate).toFixed(1)) : null, "lte", policy.maximumFallbackRateIncrease, "critical", baselineAvailable && modes), baselineAvailable },
      ];
      const reasons: string[] = [];
      if (!complete) reasons.push("incomplete_window");
      if (!Number.isInteger(plan.executions) || plan.executions < policy.minimumExecutions) reasons.push("minimum_executions:" + plan.executions + "/" + policy.minimumExecutions);
      if (!modes) reasons.push("invalid_mode_coverage");
      if (!durations) reasons.push("incomplete_duration_coverage");
      if (!tokens) reasons.push("incomplete_token_coverage");
      const failed = checks.filter(c => c.passed === false);
      const status = reasons.length ? "insufficient_data" as const : failed.some(c => c.severity === "critical") ? "critical" as const : failed.length ? "degraded" as const : "healthy" as const;
      return {
        planId: plan.planId, candidateId: plan.candidateId, status,
        sample: { executions: plan.executions, minimumExecutions: policy.minimumExecutions },
        coverage: plan.coverage,
        baseline: { available: baselineAvailable, executions: previous?.executions ?? 0, minimumExecutions: policy.minimumBaselineExecutions, reason: baselineReason },
        checks, reasons: reasons.length ? reasons : failed.map(c => c.code + ":" + c.actual + ":" + c.operator + ":" + c.threshold),
      };
    }),
  };
}
