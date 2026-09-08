import fs from "node:fs";
import { describe, expect, it } from "vitest";
describe("release rollback proposal boundary", () => {
  const service = fs.readFileSync("src/modules/agents/RecoveryRetrievalReleaseRollbackProposal.service.ts", "utf8"), route = fs.readFileSync("src/app/api/v1/settings/booking-followups/recovery/agent-outcomes/release-rollback-proposals/route.ts", "utf8"), migration = fs.readFileSync("infra/recovery-agent-retrieval-release-rollback-proposals.sql", "utf8");
  it("requires a scheduled tenant plan and rollback evidence", () => { for (const value of ['status, "scheduled"', "companyId: input.companyId", "rollback_review_required", "rollback_review_recommended", "release_rollback_evidence_not_found"]) expect(service).toContain(value); });
  it("allows only gradual bounded reductions", () => { expect(service).toContain("plan.rolloutPercent - 25"); expect(service).toContain("proposedRolloutPercent >= plan.rolloutPercent"); expect(migration).toContain("proposed_rollout_percent < current_rollout_percent"); expect(migration).toContain("GREATEST(current_rollout_percent - 25, 1)"); });
  it("freezes policies, evidence and author", () => { for (const value of ["healthPolicyVersion", "rollbackPolicyVersion", "evidence:", "createdBy: input.actorId"]) expect(service).toContain(value); expect(route).toContain("auth.auth.userId"); });
  it("does not alter plans or execute integrations", () => { for (const value of ["update(recoveryAgentRetrievalReleasePlans", "provider", "outbox", "WhatsApp", "MCP"]) expect(service).not.toContain(value); });
});
