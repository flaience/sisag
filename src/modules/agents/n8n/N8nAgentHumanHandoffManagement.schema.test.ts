import { describe, expect, it } from "vitest";
import { N8nAgentHumanHandoffActionSchema } from "./N8nAgentHumanHandoffManagement.schema";

describe("n8n agent human handoff management schema", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  it.each(["claim", "resolve", "dismiss"])("accepts %s", action => expect(N8nAgentHumanHandoffActionSchema.safeParse({ id, action }).success).toBe(true));
  it("rejects authority expansion and unknown fields", () => {
    expect(N8nAgentHumanHandoffActionSchema.safeParse({ id, action: "reopen" }).success).toBe(false);
    expect(N8nAgentHumanHandoffActionSchema.safeParse({ id, action: "claim", companyId: "other" }).success).toBe(false);
  });
});