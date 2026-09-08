export const RECOVERY_RETRIEVAL_RELEASE_ROLLBACK_POLICY = {
  version: "recovery_retrieval_release_rollback_v1",
  requiredHealthPolicyVersion: "recovery_retrieval_release_canary_health_v1",
} as const;

export type RecoveryRetrievalReleaseRollbackHealthSignal = {
  planId: string;
  status: "insufficient_data" | "healthy" | "degraded" | "critical";
  reasons: string[];
};

export function evaluateRecoveryRetrievalReleaseRollback(input: { healthPolicyVersion: string; plans: RecoveryRetrievalReleaseRollbackHealthSignal[] }) {
  const policy = RECOVERY_RETRIEVAL_RELEASE_ROLLBACK_POLICY;
  const compatible = input.healthPolicyVersion === policy.requiredHealthPolicyVersion;
  return {
    policyVersion: policy.version,
    healthPolicyVersion: input.healthPolicyVersion,
    requiresHumanApproval: true,
    automaticRollback: false,
    interpretation: "rollback eligibility is evidence for human review and never changes rollout automatically",
    plans: input.plans.map(plan => {
      const status = !compatible ? "hold" as const : plan.status === "critical" ? "rollback_review_required" as const : plan.status === "degraded" ? "rollback_review_recommended" as const : "monitor" as const;
      const reasons = !compatible ? [`health_policy_version_mismatch:${input.healthPolicyVersion}`] : plan.status === "healthy" ? [] : [`canary_health:${plan.status}`, ...plan.reasons];
      return { planId: plan.planId, status, reasons };
    }),
  };
}
