import { describe, expect, it } from "vitest";
import { RecoveryRetrievalReleaseRollbackApplySchema } from "./RecoveryRetrievalReleaseRollbackApply.schema";

describe("release rollback apply schema", () => {
  it("accepts an explicit proposal and reason", () => expect(RecoveryRetrievalReleaseRollbackApplySchema.safeParse({ id: "11111111-1111-4111-8111-111111111111", reason: "Saúde crítica confirmada" }).success).toBe(true));
  it("rejects missing justification and extra authority", () => {
    expect(RecoveryRetrievalReleaseRollbackApplySchema.safeParse({ id: "11111111-1111-4111-8111-111111111111", reason: "" }).success).toBe(false);
    expect(RecoveryRetrievalReleaseRollbackApplySchema.safeParse({ id: "11111111-1111-4111-8111-111111111111", reason: "Aplicar", companyId: "external" }).success).toBe(false);
  });
});
