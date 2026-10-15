import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { N8nAgentShadowDecisionJsonSchema, N8nAgentShadowDecisionSchema } from "./n8n/N8nAgentShadowDecision.schema";
import { buildN8nAgentShadowDecisionPrompt } from "./n8n/N8nAgentShadowDecision.service";

const routing = fs.readFileSync("src/modules/agents/n8n/N8nAgentHumanHandoffRouting.service.ts", "utf8");

const handoff = { action: "handoff", toolName: null, toolArguments: null, answerDraft: null, clarificationQuestion: null, confidence: 0.98, reasonCode: "handoff_required" };

describe("n8n agent human handoff decision contract", () => {
  it("allows the same explicit reason required by production routing", () => {
    expect(N8nAgentShadowDecisionSchema.safeParse(handoff).success).toBe(true);
    expect(N8nAgentShadowDecisionJsonSchema.properties.reasonCode.enum).toContain("handoff_required");
    expect(routing).toContain('input.decision.reasonCode !== "handoff_required"');
  });

  it("does not allow unsupported or technical reasons as model handoffs", () => {
    for (const reasonCode of ["unsupported_request", "provider_error", "invalid_output"]) {
      expect(N8nAgentShadowDecisionSchema.safeParse({ ...handoff, reasonCode }).success).toBe(false);
    }
  });

  it("instructs the model to recognize explicit requests and simple typing mistakes", () => {
    const prompt = buildN8nAgentShadowDecisionPrompt();
    for (const value of ["handoff_required", "pedir explicitamente", "atendente", "humado", "erros simples de digitação"]) expect(prompt).toContain(value);
  });
});
