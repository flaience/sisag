import { and, desc, eq } from "drizzle-orm";
import { recoveryAgentRetrievalReleasePlans, recoveryAgentRetrievalReleaseRollbackProposals } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { BookingRecoveryAgentOutcomesService } from "@/modules/automation/BookingRecoveryAgentOutcomes.service";
import type { RecoveryRetrievalReleaseRollbackProposal } from "./RecoveryRetrievalReleaseRollbackProposal.schema";

export class RecoveryRetrievalReleaseRollbackProposalService {
  static async list(input: { companyId: string }) { return { items: await getDb().select().from(recoveryAgentRetrievalReleaseRollbackProposals).where(eq(recoveryAgentRetrievalReleaseRollbackProposals.companyId, input.companyId)).orderBy(desc(recoveryAgentRetrievalReleaseRollbackProposals.createdAt)).limit(100) }; }
  static async create(input: { companyId: string; actorId: string; proposal: RecoveryRetrievalReleaseRollbackProposal }) {
    const db = getDb(), plans = await db.select({ id: recoveryAgentRetrievalReleasePlans.id, scope: recoveryAgentRetrievalReleasePlans.scope, rolloutPercent: recoveryAgentRetrievalReleasePlans.rolloutPercent }).from(recoveryAgentRetrievalReleasePlans).where(and(eq(recoveryAgentRetrievalReleasePlans.companyId, input.companyId), eq(recoveryAgentRetrievalReleasePlans.id, input.proposal.planId), eq(recoveryAgentRetrievalReleasePlans.status, "scheduled"))).limit(1), plan = plans[0];
    if (!plan) return { ok: false as const, error: "scheduled_release_plan_not_found" as const };
    const outcomes = await BookingRecoveryAgentOutcomesService.get({ companyId: input.companyId, days: 30 }), rollback = outcomes.retrieval.releaseCanaries.rollback, decision = rollback.plans.find(item => item.planId === plan.id);
    if (!decision) return { ok: false as const, error: "release_rollback_evidence_not_found" as const };
    if (decision.status !== "rollback_review_required" && decision.status !== "rollback_review_recommended") return { ok: false as const, error: "release_not_eligible_for_rollback_review" as const };
    const minimum = Math.max(plan.rolloutPercent - 25, 1);
    if (input.proposal.proposedRolloutPercent >= plan.rolloutPercent || input.proposal.proposedRolloutPercent < minimum) return { ok: false as const, error: "invalid_rollout_rollback" as const };
    try {
      const saved = await db.insert(recoveryAgentRetrievalReleaseRollbackProposals).values({ companyId: input.companyId, releasePlanId: plan.id, scope: plan.scope, status: "proposed", currentRolloutPercent: plan.rolloutPercent, proposedRolloutPercent: input.proposal.proposedRolloutPercent, healthPolicyVersion: rollback.healthPolicyVersion, rollbackPolicyVersion: rollback.policyVersion, evidence: { decision: decision.status, reasons: decision.reasons, observedDays: 30 }, reason: input.proposal.reason, createdBy: input.actorId }).returning({ id: recoveryAgentRetrievalReleaseRollbackProposals.id });
      return { ok: true as const, id: saved[0]!.id };
    } catch (error) { if ((error as { code?: string }).code === "23505") return { ok: false as const, error: "release_rollback_proposal_exists" as const }; throw error; }
  }
}
