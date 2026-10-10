import fs from "node:fs";
import { describe, expect, it } from "vitest";
const workflow = fs.readFileSync("automation/n8n/workflows/sisag-agent-shadow-v3.json", "utf8");
const schema = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowMirrorResponse.schema.ts", "utf8");
const service = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowMirrorObservation.service.ts", "utf8");
describe("n8n agent shadow decision observability boundary", () => {
  it("returns and persists only approved decision metadata", () => {
    for (const value of ["decisionAction", "toolName", "reasonCode", "confidenceMilli", "executionMode", "provider", "model", "promptVersion", "modelDurationMs", "modelErrorCode"]) expect(service).toContain(value);
    for (const forbidden of ["answerDraft", "clarificationQuestion", "evidence", "senderPhone", "message.text"]) expect(schema + service).not.toContain(forbidden);
  });
  it("versions an inactive no-retention v3 workflow", () => {
    const parsed = JSON.parse(workflow);
    expect(parsed.name).toBe("SISAG Agent Shadow v3");
    expect(parsed.active).toBe(false);
    expect(parsed.settings).toMatchObject({ saveDataErrorExecution: "none", saveDataSuccessExecution: "none", saveManualExecutions: false });
    expect(workflow).toContain("sideEffects: 'none'");
  });
  it("does not return private model text from n8n", () => {
    for (const forbidden of ["answerDraft: $json", "clarificationQuestion: $json", "evidence: $json"]) expect(workflow).not.toContain(forbidden);
  });
});
