import fs from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = JSON.parse(fs.readFileSync("automation/n8n/workflows/sisag-agent-shadow-v1.json", "utf8"));
const route = fs.readFileSync("src/app/api/platform/agents/n8n/read-only/route.ts", "utf8");
const observation = fs.readFileSync("src/modules/agents/n8n/N8nAgentGatewayObservation.ts", "utf8");
const doc = fs.readFileSync("docs/n8n-agent-shadow-sanitized-observability.md", "utf8");

describe("n8n agent shadow sanitized observability boundary", () => {
  it("prevents n8n from retaining inbound headers and payloads", () => {
    expect(workflow.settings).toMatchObject({ saveDataErrorExecution: "none", saveDataSuccessExecution: "none", saveManualExecutions: false });
  });

  it("records a structured sanitized observation in SISAG logs", () => {
    expect(route).toContain("createN8nAgentGatewayObservation");
    expect(route).toContain("console.info(JSON.stringify");
    for (const value of ["companyId", "correlationId", "toolName", "contentHash", "errorCode"]) expect(observation).toContain(value);
  });

  it("explicitly excludes sensitive and business payloads", () => {
    for (const value of ["texto da mensagem", "telefone", "segredos", "resposta operacional da agenda"]) expect(doc).toContain(value);
  });
});
