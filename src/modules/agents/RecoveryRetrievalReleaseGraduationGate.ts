export const RECOVERY_RETRIEVAL_RELEASE_GRADUATION_POLICY = {
  version: "recovery_retrieval_release_graduation_v1",
  requiredHealthPolicyVersion: "recovery_retrieval_release_canary_health_v1",
  requiredRolloutPercent: 100,
} as const;

export type RecoveryRetrievalReleaseGraduationInput = {
  healthPolicyVersion: string;
  now: Date;
  plans: Array<{
    planId: string;
    status: string;
    rolloutPercent: number;
    startsAt: Date;
    endsAt: Date;
    health: { status: "insufficient_data" | "healthy" | "degraded" | "critical"; reasons: string[] } | null;
  }>;
};

export function evaluateRecoveryRetrievalReleaseGraduation(input: RecoveryRetrievalReleaseGraduationInput) {
  const policy = RECOVERY_RETRIEVAL_RELEASE_GRADUATION_POLICY;
  const compatible = input.healthPolicyVersion === policy.requiredHealthPolicyVersion;
  return {
    policyVersion: policy.version,
    healthPolicyVersion: input.healthPolicyVersion,
    requiresHumanApproval: true,
    automaticGraduation: false,
    interpretation: "eligibility permits a governed human review and never makes retrieval stable automatically",
    plans: input.plans.map(plan => {
      const reasons: string[] = [];
      if (!compatible) reasons.push("health_policy_version_mismatch:" + input.healthPolicyVersion);
      if (plan.status !== "scheduled") reasons.push("release_plan_status:" + plan.status);
      if (plan.rolloutPercent !== policy.requiredRolloutPercent) reasons.push("release_rollout_percent:" + plan.rolloutPercent + "/" + policy.requiredRolloutPercent);
      if (input.now < plan.startsAt || input.now > plan.endsAt) reasons.push("release_window_not_active");
      if (!plan.health) reasons.push("canary_health:missing");
      else if (plan.health.status !== "healthy") reasons.push("canary_health:" + plan.health.status, ...plan.health.reasons);
      return { planId: plan.planId, status: reasons.length ? "hold" as const : "eligible_for_graduation" as const, reasons };
    }),
  };
}
