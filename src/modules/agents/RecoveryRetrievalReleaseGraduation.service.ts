import { BookingRecoveryAgentOutcomesService } from "@/modules/automation/BookingRecoveryAgentOutcomes.service";
import { RecoveryRetrievalReleasePlanService } from "./RecoveryRetrievalReleasePlan.service";
import { evaluateRecoveryRetrievalReleaseGraduation } from "./RecoveryRetrievalReleaseGraduationGate";

export class RecoveryRetrievalReleaseGraduationService {
  static async get(input: { companyId: string; days?: number; now?: Date }) {
    const days = Math.min(Math.max(Math.trunc(input.days ?? 30), 1), 90), now = input.now ?? new Date();
    const [releasePlans, outcomes] = await Promise.all([
      RecoveryRetrievalReleasePlanService.list({ companyId: input.companyId }),
      BookingRecoveryAgentOutcomesService.get({ companyId: input.companyId, days, now }),
    ]);
    const health = outcomes.retrieval.releaseCanaries.health, byPlan = new Map(health.plans.map(item => [item.planId, item]));
    return {
      period: outcomes.period,
      ...evaluateRecoveryRetrievalReleaseGraduation({
        healthPolicyVersion: health.policyVersion,
        now,
        plans: releasePlans.items.map(plan => ({
          planId: plan.id,
          status: plan.status,
          rolloutPercent: plan.rolloutPercent,
          startsAt: new Date(plan.startsAt),
          endsAt: new Date(plan.endsAt),
          health: byPlan.get(plan.id) ?? null,
        })),
      }),
    };
  }
}
