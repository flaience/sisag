import { describe, expect, it } from "vitest";
import { RecoveryRetrievalReleaseRollbackProposalSchema as schema } from "./RecoveryRetrievalReleaseRollbackProposal.schema";
const valid = { planId: "11111111-1111-4111-8111-111111111111", proposedRolloutPercent: 25, reason: "reduce exposure for review" };
describe("release rollback proposal schema", () => {
  it("accepts a bounded proposal", () => expect(schema.safeParse(valid).success).toBe(true));
  it("bounds target and reason", () => { expect(schema.safeParse({ ...valid, proposedRolloutPercent: 0 }).success).toBe(false); expect(schema.safeParse({ ...valid, proposedRolloutPercent: 100 }).success).toBe(false); expect(schema.safeParse({ ...valid, reason: "x" }).success).toBe(false); });
  it("rejects operational overrides", () => expect(schema.safeParse({ ...valid, action: "apply" }).success).toBe(false));
});
