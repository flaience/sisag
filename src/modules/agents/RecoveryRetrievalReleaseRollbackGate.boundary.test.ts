import fs from "node:fs";
import { describe, expect, it } from "vitest";
describe("release rollback gate boundary", () => {
  const gate = fs.readFileSync("src/modules/agents/RecoveryRetrievalReleaseRollbackGate.ts", "utf8"), outcomes = fs.readFileSync("src/modules/automation/BookingRecoveryAgentOutcomes.service.ts", "utf8");
  it("binds rollback to a versioned health contract", () => { for (const value of ["recovery_retrieval_release_rollback_v1", "requiredHealthPolicyVersion", "health_policy_version_mismatch"]) expect(gate).toContain(value); });
  it("distinguishes degraded and critical review", () => { expect(gate).toContain("rollback_review_recommended"); expect(gate).toContain("rollback_review_required"); });
  it("requires human approval without automatic rollback", () => { expect(gate).toContain("requiresHumanApproval: true"); expect(gate).toContain("automaticRollback: false"); });
  it("has no mutation or integration capability", () => { for (const value of ["getDb", ".insert(", ".update(", ".delete(", "provider", "outbox", "WhatsApp", "MCP"]) expect(gate).not.toContain(value); });
  it("publishes the decision beside health and progression", () => { expect(outcomes).toContain("evaluateRecoveryRetrievalReleaseRollback"); expect(outcomes).toContain("rollback: releaseRollback"); });
});
