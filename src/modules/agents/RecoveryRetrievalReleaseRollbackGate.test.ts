import { describe, expect, it } from "vitest";
import { evaluateRecoveryRetrievalReleaseRollback as evaluate } from "./RecoveryRetrievalReleaseRollbackGate";
const input = (status: "insufficient_data" | "healthy" | "degraded" | "critical", reasons: string[] = []) => ({ healthPolicyVersion: "recovery_retrieval_release_canary_health_v1", plans: [{ planId: "p", status, reasons }] });
describe("release rollback gate", () => {
  it("requires review for critical canaries", () => expect(evaluate(input("critical", ["fallback"]))).toMatchObject({ policyVersion: "recovery_retrieval_release_rollback_v1", requiresHumanApproval: true, automaticRollback: false, plans: [{ planId: "p", status: "rollback_review_required", reasons: ["canary_health:critical", "fallback"] }] }));
  it("recommends review for degraded canaries", () => expect(evaluate(input("degraded")).plans[0]?.status).toBe("rollback_review_recommended"));
  it.each(["healthy", "insufficient_data"] as const)("monitors %s canaries", status => expect(evaluate(input(status)).plans[0]?.status).toBe("monitor"));
  it("fails closed for an incompatible health contract", () => expect(evaluate({ ...input("critical"), healthPolicyVersion: "unknown" }).plans[0]).toMatchObject({ status: "hold", reasons: ["health_policy_version_mismatch:unknown"] }));
});
