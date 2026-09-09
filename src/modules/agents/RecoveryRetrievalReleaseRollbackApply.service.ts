import { and, eq } from "drizzle-orm";
import { recoveryAgentRetrievalReleasePlans, recoveryAgentRetrievalReleaseRollbackProposals } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { BookingRecoveryAgentOutcomesService } from "@/modules/automation/BookingRecoveryAgentOutcomes.service";
import type { RecoveryRetrievalReleaseRollbackApply } from "./RecoveryRetrievalReleaseRollbackApply.schema";

class RollbackApplyConflict extends Error {
  constructor(readonly code: "concurrent_release_rollback" | "release_plan_changed") { super(code); }
}

export class RecoveryRetrievalReleaseRollbackApplyService {
  static async apply(input: { companyId: string; actorId: string; command: RecoveryRetrievalReleaseRollbackApply }) {
    const db = getDb();
    const rows = await db.select({
      id: recoveryAgentRetrievalReleaseRollbackProposals.id,
      releasePlanId: recoveryAgentRetrievalReleaseRollbackProposals.releasePlanId,
      currentRolloutPercent: recoveryAgentRetrievalReleaseRollbackProposals.currentRolloutPercent,
      proposedRolloutPercent: recoveryAgentRetrievalReleaseRollbackProposals.proposedRolloutPercent,
      healthPolicyVersion: recoveryAgentRetrievalReleaseRollbackProposals.healthPolicyVersion,
      rollbackPolicyVersion: recoveryAgentRetrievalReleaseRollbackProposals.rollbackPolicyVersion,
    }).from(recoveryAgentRetrievalReleaseRollbackProposals).where(and(
      eq(recoveryAgentRetrievalReleaseRollbackProposals.companyId, input.companyId),
      eq(recoveryAgentRetrievalReleaseRollbackProposals.id, input.command.id),
      eq(recoveryAgentRetrievalReleaseRollbackProposals.status, "approved"),
    )).limit(1);
    const proposal = rows[0];
    if (!proposal) return { ok: false as const, error: "approved_release_rollback_not_found" as const };

    const outcomes = await BookingRecoveryAgentOutcomesService.get({ companyId: input.companyId, days: 30 });
    const rollback = outcomes.retrieval.releaseCanaries.rollback;
    const decision = rollback.plans.find(item => item.planId === proposal.releasePlanId);
    if (rollback.healthPolicyVersion !== proposal.healthPolicyVersion || rollback.policyVersion !== proposal.rollbackPolicyVersion) {
      return { ok: false as const, error: "release_rollback_policy_changed" as const };
    }
    if (!decision || (decision.status !== "rollback_review_required" && decision.status !== "rollback_review_recommended")) {
      return { ok: false as const, error: "release_rollback_health_changed" as const };
    }

    const now = new Date();
    try {
      return await db.transaction(async tx => {
        const plans = await tx.update(recoveryAgentRetrievalReleasePlans).set({ rolloutPercent: proposal.proposedRolloutPercent }).where(and(
          eq(recoveryAgentRetrievalReleasePlans.companyId, input.companyId),
          eq(recoveryAgentRetrievalReleasePlans.id, proposal.releasePlanId),
          eq(recoveryAgentRetrievalReleasePlans.status, "scheduled"),
          eq(recoveryAgentRetrievalReleasePlans.rolloutPercent, proposal.currentRolloutPercent),
        )).returning({ id: recoveryAgentRetrievalReleasePlans.id, rolloutPercent: recoveryAgentRetrievalReleasePlans.rolloutPercent });
        if (!plans[0]) throw new RollbackApplyConflict("release_plan_changed");

        const applied = await tx.update(recoveryAgentRetrievalReleaseRollbackProposals).set({
          status: "applied",
          appliedBy: input.actorId,
          appliedAt: now,
          applicationReason: input.command.reason,
          applicationEvidence: {
            decision: decision.status,
            reasons: decision.reasons,
            healthPolicyVersion: rollback.healthPolicyVersion,
            rollbackPolicyVersion: rollback.policyVersion,
            observedDays: 30,
          },
        }).where(and(
          eq(recoveryAgentRetrievalReleaseRollbackProposals.companyId, input.companyId),
          eq(recoveryAgentRetrievalReleaseRollbackProposals.id, proposal.id),
          eq(recoveryAgentRetrievalReleaseRollbackProposals.status, "approved"),
        )).returning({ id: recoveryAgentRetrievalReleaseRollbackProposals.id });
        if (!applied[0]) throw new RollbackApplyConflict("concurrent_release_rollback");
        return { ok: true as const, id: applied[0].id, releasePlanId: plans[0].id, rolloutPercent: plans[0].rolloutPercent };
      });
    } catch (error) {
      if (error instanceof RollbackApplyConflict) return { ok: false as const, error: error.code };
      throw error;
    }
  }
}
