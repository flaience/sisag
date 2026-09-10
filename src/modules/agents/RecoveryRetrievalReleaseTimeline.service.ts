import { RecoveryRetrievalReleaseCandidateService } from "./RecoveryRetrievalReleaseCandidate.service";
import { RecoveryRetrievalReleasePlanService } from "./RecoveryRetrievalReleasePlan.service";
import { RecoveryRetrievalReleaseProgressionProposalService } from "./RecoveryRetrievalReleaseProgressionProposal.service";
import { RecoveryRetrievalReleaseRollbackProposalService } from "./RecoveryRetrievalReleaseRollbackProposal.service";
import { BookingRecoveryAgentOutcomesService } from "@/modules/automation/BookingRecoveryAgentOutcomes.service";

type TimelineKind = "candidate_created" | "candidate_reviewed" | "plan_scheduled" | "plan_stopped" | "health_snapshot" | "progression_proposed" | "progression_reviewed" | "progression_applied" | "rollback_proposed" | "rollback_reviewed" | "rollback_applied";
type TimelineEvent = { id: string; kind: TimelineKind; occurredAt: string; scope: string; status: string; releasePlanId: string | null; releaseCandidateId: string | null; rolloutPercent: number | null; previousRolloutPercent: number | null; reason: string | null; details: Record<string, unknown> };
const iso = (value: unknown) => value instanceof Date ? value.toISOString() : typeof value === "string" ? new Date(value).toISOString() : null;

export class RecoveryRetrievalReleaseTimelineService {
  static async get(input: { companyId: string; days?: number }) {
    const days = Math.min(Math.max(Math.trunc(input.days ?? 30), 1), 90);
    const [candidates, plans, progressions, rollbacks, outcomes] = await Promise.all([
      RecoveryRetrievalReleaseCandidateService.list({ companyId: input.companyId }),
      RecoveryRetrievalReleasePlanService.list({ companyId: input.companyId }),
      RecoveryRetrievalReleaseProgressionProposalService.list({ companyId: input.companyId }),
      RecoveryRetrievalReleaseRollbackProposalService.list({ companyId: input.companyId }),
      BookingRecoveryAgentOutcomesService.get({ companyId: input.companyId, days }),
    ]);
    const events: TimelineEvent[] = [];
    const add = (event: TimelineEvent) => events.push(event);
    for (const item of candidates.items) {
      add({ id: "candidate-created:" + item.id, kind: "candidate_created", occurredAt: iso(item.createdAt)!, scope: item.scope, status: "draft", releasePlanId: null, releaseCandidateId: item.id, rolloutPercent: null, previousRolloutPercent: null, reason: item.reason, details: { candidateVersion: item.candidateVersion } });
      if (item.reviewedAt) add({ id: "candidate-reviewed:" + item.id, kind: "candidate_reviewed", occurredAt: iso(item.reviewedAt)!, scope: item.scope, status: item.status, releasePlanId: null, releaseCandidateId: item.id, rolloutPercent: null, previousRolloutPercent: null, reason: item.reviewReason, details: {} });
    }
    for (const item of plans.items) {
      add({ id: "plan-scheduled:" + item.id, kind: "plan_scheduled", occurredAt: iso(item.createdAt)!, scope: item.scope, status: "scheduled", releasePlanId: item.id, releaseCandidateId: item.releaseCandidateId, rolloutPercent: item.rolloutPercent, previousRolloutPercent: null, reason: item.reason, details: { startsAt: iso(item.startsAt), endsAt: iso(item.endsAt) } });
      if (item.stoppedAt) add({ id: "plan-stopped:" + item.id, kind: "plan_stopped", occurredAt: iso(item.stoppedAt)!, scope: item.scope, status: "stopped", releasePlanId: item.id, releaseCandidateId: item.releaseCandidateId, rolloutPercent: item.rolloutPercent, previousRolloutPercent: null, reason: item.stopReason, details: {} });
    }
    for (const item of progressions.items) {
      add({ id: "progression-proposed:" + item.id, kind: "progression_proposed", occurredAt: iso(item.createdAt)!, scope: item.scope, status: "proposed", releasePlanId: item.releasePlanId, releaseCandidateId: null, rolloutPercent: item.proposedRolloutPercent, previousRolloutPercent: item.currentRolloutPercent, reason: item.reason, details: { evidence: item.evidence } });
      if (item.reviewedAt) add({ id: "progression-reviewed:" + item.id, kind: "progression_reviewed", occurredAt: iso(item.reviewedAt)!, scope: item.scope, status: item.status === "applied" ? "approved" : item.status, releasePlanId: item.releasePlanId, releaseCandidateId: null, rolloutPercent: item.proposedRolloutPercent, previousRolloutPercent: item.currentRolloutPercent, reason: item.reviewReason, details: {} });
      if (item.appliedAt) add({ id: "progression-applied:" + item.id, kind: "progression_applied", occurredAt: iso(item.appliedAt)!, scope: item.scope, status: "applied", releasePlanId: item.releasePlanId, releaseCandidateId: null, rolloutPercent: item.proposedRolloutPercent, previousRolloutPercent: item.currentRolloutPercent, reason: item.applicationReason, details: { evidence: item.applicationEvidence } });
    }
    for (const item of rollbacks.items) {
      add({ id: "rollback-proposed:" + item.id, kind: "rollback_proposed", occurredAt: iso(item.createdAt)!, scope: item.scope, status: "proposed", releasePlanId: item.releasePlanId, releaseCandidateId: null, rolloutPercent: item.proposedRolloutPercent, previousRolloutPercent: item.currentRolloutPercent, reason: item.reason, details: { evidence: item.evidence } });
      if (item.reviewedAt) add({ id: "rollback-reviewed:" + item.id, kind: "rollback_reviewed", occurredAt: iso(item.reviewedAt)!, scope: item.scope, status: item.status === "applied" ? "approved" : item.status, releasePlanId: item.releasePlanId, releaseCandidateId: null, rolloutPercent: item.proposedRolloutPercent, previousRolloutPercent: item.currentRolloutPercent, reason: item.reviewReason, details: {} });
      if (item.appliedAt) add({ id: "rollback-applied:" + item.id, kind: "rollback_applied", occurredAt: iso(item.appliedAt)!, scope: item.scope, status: "applied", releasePlanId: item.releasePlanId, releaseCandidateId: null, rolloutPercent: item.proposedRolloutPercent, previousRolloutPercent: item.currentRolloutPercent, reason: item.applicationReason, details: { evidence: item.applicationEvidence } });
    }
    const health = outcomes.retrieval.releaseCanaries.health;
    for (const item of health.plans) add({ id: "health:" + item.planId + ":" + outcomes.period.to, kind: "health_snapshot", occurredAt: outcomes.period.to, scope: plans.items.find(plan => plan.id === item.planId)?.scope ?? "recovery", status: item.status, releasePlanId: item.planId, releaseCandidateId: null, rolloutPercent: plans.items.find(plan => plan.id === item.planId)?.rolloutPercent ?? null, previousRolloutPercent: null, reason: item.reasons.join(" · ") || null, details: { policyVersion: health.policyVersion, sample: item.sample, checks: item.checks } });
    const from = new Date(outcomes.period.from).getTime();
    const items = events.filter(event => new Date(event.occurredAt).getTime() >= from).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 300);
    return { period: outcomes.period, summary: { events: items.length, candidates: candidates.items.length, plans: plans.items.length, activePlans: plans.items.filter(item => item.status === "scheduled").length, healthSnapshots: health.plans.length }, items, readOnly: true as const };
  }
}
