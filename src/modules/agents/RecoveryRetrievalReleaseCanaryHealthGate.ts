export const RECOVERY_RETRIEVAL_RELEASE_CANARY_HEALTH_POLICY = {
  version: "recovery_retrieval_release_canary_health_v1",
  minimumSelectedExecutions: 20,
  minimumSuccessRate: 95,
  maximumFallbackRate: 5,
  maximumP95DurationMs: 2000,
  maximumAverageTokens: 5000,
  minimumAverageOverlapRate: 50,
} as const;

export type RecoveryRetrievalReleaseCanaryPlanMetrics = {
  planId: string;
  selected: number;
  aiRuns: number;
  fallbackRuns: number;
  successRate: number;
  averageTokens: number;
  p95DurationMs: number;
  averageOverlapRate: number;
};

type Check = { code:string; passed:boolean; actual:number; operator:"gte"|"lte"; threshold:number; severity:"degraded"|"critical" };

export function evaluateRecoveryRetrievalReleaseCanaryHealth(plans:RecoveryRetrievalReleaseCanaryPlanMetrics[]){const policy=RECOVERY_RETRIEVAL_RELEASE_CANARY_HEALTH_POLICY;return{policyVersion:policy.version,automaticAction:false,interpretation:"health signals require human review and never stop or promote a release automatically",plans:plans.map(plan=>{const fallbackRate=plan.selected?Number((plan.fallbackRuns*100/plan.selected).toFixed(1)):0,checks:Check[]=[{code:"success_rate",passed:plan.successRate>=policy.minimumSuccessRate,actual:plan.successRate,operator:"gte",threshold:policy.minimumSuccessRate,severity:"critical"},{code:"fallback_rate",passed:fallbackRate<=policy.maximumFallbackRate,actual:fallbackRate,operator:"lte",threshold:policy.maximumFallbackRate,severity:"critical"},{code:"p95_duration_ms",passed:plan.p95DurationMs<=policy.maximumP95DurationMs,actual:plan.p95DurationMs,operator:"lte",threshold:policy.maximumP95DurationMs,severity:"degraded"},{code:"average_tokens",passed:plan.averageTokens<=policy.maximumAverageTokens,actual:plan.averageTokens,operator:"lte",threshold:policy.maximumAverageTokens,severity:"degraded"},{code:"lexical_overlap_rate",passed:plan.averageOverlapRate>=policy.minimumAverageOverlapRate,actual:plan.averageOverlapRate,operator:"gte",threshold:policy.minimumAverageOverlapRate,severity:"degraded"}],enoughData=plan.selected>=policy.minimumSelectedExecutions,failed=checks.filter(check=>!check.passed),status=!enoughData?"insufficient_data"as const:failed.some(check=>check.severity==="critical")?"critical"as const:failed.length?"degraded"as const:"healthy"as const;return{planId:plan.planId,status,sample:{selected:plan.selected,minimumSelected:policy.minimumSelectedExecutions},checks,reasons:!enoughData?[`minimum_selected_executions:${plan.selected}/${policy.minimumSelectedExecutions}`]:failed.map(check=>`${check.code}:${check.actual}:${check.operator}:${check.threshold}`)}})}}
