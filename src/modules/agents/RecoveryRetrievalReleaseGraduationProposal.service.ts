import { and, desc, eq } from "drizzle-orm";
import { recoveryAgentRetrievalReleaseGraduationProposals, recoveryAgentRetrievalReleasePlans } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { RecoveryRetrievalReleaseGraduationService } from "./RecoveryRetrievalReleaseGraduation.service";
import type { RecoveryRetrievalReleaseGraduationProposal } from "./RecoveryRetrievalReleaseGraduationProposal.schema";

export class RecoveryRetrievalReleaseGraduationProposalService {
  static async list(input: { companyId: string }) { return { items: await getDb().select().from(recoveryAgentRetrievalReleaseGraduationProposals).where(eq(recoveryAgentRetrievalReleaseGraduationProposals.companyId, input.companyId)).orderBy(desc(recoveryAgentRetrievalReleaseGraduationProposals.createdAt)).limit(100) }; }
  static async create(input: { companyId: string; actorId: string; proposal: RecoveryRetrievalReleaseGraduationProposal }) {
    const db = getDb();
    const plans = await db.select({ id: recoveryAgentRetrievalReleasePlans.id, releaseCandidateId: recoveryAgentRetrievalReleasePlans.releaseCandidateId, scope: recoveryAgentRetrievalReleasePlans.scope, status: recoveryAgentRetrievalReleasePlans.status, rolloutPercent: recoveryAgentRetrievalReleasePlans.rolloutPercent }).from(recoveryAgentRetrievalReleasePlans).where(and(eq(recoveryAgentRetrievalReleasePlans.companyId, input.companyId), eq(recoveryAgentRetrievalReleasePlans.id, input.proposal.planId), eq(recoveryAgentRetrievalReleasePlans.status, "scheduled"), eq(recoveryAgentRetrievalReleasePlans.rolloutPercent, 100))).limit(1);
    const plan = plans[0];
    if (!plan) return { ok: false as const, error: "full_release_plan_not_found" as const };
    const graduation = await RecoveryRetrievalReleaseGraduationService.get({ companyId: input.companyId, days: 30 });
    const decision = graduation.plans.find(item => item.planId === plan.id);
    if (!decision) return { ok: false as const, error: "release_graduation_evidence_not_found" as const };
    if (decision.status !== "eligible_for_graduation") return { ok: false as const, error: "release_not_eligible_for_graduation" as const };
    try {
      const saved = await db.insert(recoveryAgentRetrievalReleaseGraduationProposals).values({ companyId: input.companyId, releasePlanId: plan.id, releaseCandidateId: plan.releaseCandidateId, scope: plan.scope, status: "proposed", rolloutPercent: plan.rolloutPercent, healthPolicyVersion: graduation.healthPolicyVersion, graduationPolicyVersion: graduation.policyVersion, evidence: { decision: decision.status, reasons: decision.reasons, observedDays: graduation.period.days, observedFrom: graduation.period.from, observedTo: graduation.period.to }, reason: input.proposal.reason, createdBy: input.actorId }).returning({ id: recoveryAgentRetrievalReleaseGraduationProposals.id });
      return { ok: true as const, id: saved[0]!.id };
    } catch (error) {
      if ((error as { code?: string }).code === "23505") return { ok: false as const, error: "release_graduation_proposal_exists" as const };
      throw error;
    }
  }
}
