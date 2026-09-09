import fs from "node:fs";
import { describe, expect, it } from "vitest";

const source = (name: string) => fs.readFileSync(name, "utf8");

describe("retrieval release operational readiness", () => {
  const candidateReview = source("src/modules/agents/RecoveryRetrievalReleaseCandidateReview.service.ts");
  const planRuntime = source("src/modules/agents/RecoveryRetrievalReleasePlanRuntime.service.ts");
  const canaryRuntime = source("src/modules/automation/BookingRecoveryRecommendation.service.ts");
  const metrics = source("src/modules/agents/RecoveryRetrievalReleaseCanaryMetrics.ts");
  const health = source("src/modules/agents/RecoveryRetrievalReleaseCanaryHealthGate.ts");
  const progressionGate = source("src/modules/agents/RecoveryRetrievalReleaseProgressionGate.ts");
  const progressionApply = source("src/modules/agents/RecoveryRetrievalReleaseProgressionApply.service.ts");
  const rollbackGate = source("src/modules/agents/RecoveryRetrievalReleaseRollbackGate.ts");
  const rollbackApply = source("src/modules/agents/RecoveryRetrievalReleaseRollbackApply.service.ts");
  const progressionRoute = source("src/app/api/v1/settings/booking-followups/recovery/agent-outcomes/release-progression-proposals/route.ts");
  const rollbackRoute = source("src/app/api/v1/settings/booking-followups/recovery/agent-outcomes/release-rollback-proposals/route.ts");

  it("keeps candidate approval separate from runtime selection", () => {
    expect(candidateReview).toContain('status,"draft"');
    expect(candidateReview).toContain("companyId,input.companyId");
    expect(candidateReview).not.toContain("rolloutPercent");
    for (const value of ['status,"approved"', 'status,"scheduled"', "input.companyId", "input.caseId", "outside_release_rollout"]) expect(planRuntime).toContain(value);
  });

  it("runs canaries with an explicit lexical fallback and isolated telemetry", () => {
    for (const value of ["lexical:knowledge", "release", 'release?.selected&&vectorShadow.mode==="ai"', ":knowledge"]) expect(canaryRuntime).toContain(value);
    for (const value of ["planId", "selected", "fallbackRuns", "successRate", "p95DurationMs", "averageOverlapRate", "errors"]) expect(metrics).toContain(value);
  });

  it("fails closed before either rollout direction", () => {
    for (const value of ["minimumSelectedExecutions", "maximumFallbackRate", "maximumP95DurationMs", "minimumAverageOverlapRate", "automaticAction:false"]) expect(health).toContain(value);
    for (const value of ["requiredHealthPolicyVersion", "requiresHumanApproval:true", "automaticExpansion:false", "eligible_for_expansion"]) expect(progressionGate).toContain(value);
    for (const value of ["requiredHealthPolicyVersion", "requiresHumanApproval: true", "automaticRollback: false", "rollback_review_required"]) expect(rollbackGate).toContain(value);
  });

  it("revalidates and applies progression atomically", () => {
    for (const value of ["release_progression_policy_changed", "release_progression_health_changed", "db.transaction(async tx", "proposal.currentRolloutPercent", 'status:"applied"', "concurrent_release_progression"]) expect(progressionApply).toContain(value);
    for (const value of ['requireApiRole(request,["owner"])', "auth.auth.companyId", "auth.auth.userId", "export async function PUT"]) expect(progressionRoute).toContain(value);
  });

  it("revalidates and applies rollback atomically", () => {
    for (const value of ["release_rollback_policy_changed", "release_rollback_health_changed", "db.transaction(async tx", "proposal.currentRolloutPercent", 'status: "applied"', "concurrent_release_rollback"]) expect(rollbackApply).toContain(value);
    for (const value of ['requireApiRole(request, ["owner"])', "auth.auth.companyId", "auth.auth.userId", "export async function PUT"]) expect(rollbackRoute).toContain(value);
  });

  it("keeps channel execution outside release governance", () => {
    for (const unit of [candidateReview, planRuntime, metrics, health, progressionGate, progressionApply, rollbackGate, rollbackApply]) {
      for (const forbidden of ["sendWhatsApp", "enqueueOutbox", "executeMcpTool"]) expect(unit).not.toContain(forbidden);
    }
  });
});
