import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("release rollback apply boundary", () => {
  const service = fs.readFileSync("src/modules/agents/RecoveryRetrievalReleaseRollbackApply.service.ts", "utf8");
  const route = fs.readFileSync("src/app/api/v1/settings/booking-followups/recovery/agent-outcomes/release-rollback-proposals/route.ts", "utf8");
  const migration = fs.readFileSync("infra/recovery-agent-retrieval-release-rollback-apply.sql", "utf8");

  it("requires an approved tenant proposal", () => {
    expect(service).toContain('status, "approved"');
    expect(service.match(/companyId/g)?.length).toBeGreaterThanOrEqual(5);
    expect(service).toContain("approved_release_rollback_not_found");
  });
  it("revalidates health and policy versions immediately", () => {
    for (const value of ["BookingRecoveryAgentOutcomesService.get", "release_rollback_policy_changed", "release_rollback_health_changed", "rollback_review_required", "rollback_review_recommended"]) expect(service).toContain(value);
  });
  it("updates plan and proposal atomically with optimistic guards", () => {
    expect(service).toContain("db.transaction(async tx");
    expect(service).toContain("proposal.currentRolloutPercent");
    expect(service).toContain('status, "scheduled"');
    expect(service).toContain("RollbackApplyConflict");
    expect(service).toContain('status: "applied"');
  });
  it("records executor and evidence without autonomous integrations", () => {
    for (const value of ["appliedBy: input.actorId", "appliedAt: now", "applicationReason: input.command.reason", "applicationEvidence:"]) expect(service).toContain(value);
    expect(route).toContain("auth.auth.userId");
    expect(migration).toContain("rollout_percent BETWEEN 1 AND 100");
    for (const value of ["provider", "outbox", "WhatsApp", "MCP"]) expect(service).not.toContain(value);
  });
});
