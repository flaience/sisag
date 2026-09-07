import { describe, expect, it } from "vitest";
import { RecoveryRetrievalExperimentEvaluationSchema } from "./RecoveryRetrievalExperimentEvaluation.schema";

describe("retrieval experiment evaluation schema", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  it.each(["adopt", "reject", "inconclusive"])("accepts the governed %s decision", decision => expect(RecoveryRetrievalExperimentEvaluationSchema.safeParse({ experimentId: id, decision, reason: "human evidence review" }).success).toBe(true));
  it("rejects operational decisions", () => expect(RecoveryRetrievalExperimentEvaluationSchema.safeParse({ experimentId: id, decision: "activate", reason: "not allowed" }).success).toBe(false));
  it("bounds the justification", () => {
    expect(RecoveryRetrievalExperimentEvaluationSchema.safeParse({ experimentId: id, decision: "reject", reason: "no" }).success).toBe(false);
    expect(RecoveryRetrievalExperimentEvaluationSchema.safeParse({ experimentId: id, decision: "reject", reason: "x".repeat(501) }).success).toBe(false);
  });
});
