import fs from "node:fs";
import { describe, expect, it } from "vitest";

const policy = fs.readFileSync("src/modules/agents/n8n/N8nAgentDirectClarification.ts", "utf8");
const routing = fs.readFileSync("src/modules/agents/n8n/N8nAgentAnswerCandidateRouting.service.ts", "utf8");
const schema = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowMirrorResponse.schema.ts", "utf8");
const workflow = fs.readFileSync("automation/n8n/workflows/sisag-agent-shadow-v14.json", "utf8");

describe("n8n agent missing information clarification routing", () => {
  it("propagates the bounded question from v14", () => {
    expect(schema).toContain("clarificationQuestion");
    expect(workflow).toContain("clarificationQuestion: $json.gatewayResult.decision.clarificationQuestion ?? null");
    for (const value of ["missing_information", "sanitizeQuestion", "slice(0, 300)"]) expect(policy).toContain(value);
  });
  it("routes only a skipped clarification without a tool execution", () => {
    for (const value of ["requested === false", `status === "skipped"`, "errorCode === null", "shadow_policy"]) expect(policy).toContain(value);
    expect(routing).toContain("missing_information");
  });
  it("does not add scheduling mutations", () => {
    for (const forbidden of ["createAppointment", "cancelAppointment", "rescheduleAppointment"]) expect(policy + routing).not.toContain(forbidden);
  });
});
