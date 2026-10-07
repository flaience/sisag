import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { N8N_AGENT_SHADOW_WORKFLOW } from "./N8nAgentShadowWorkflow";

const workflow = JSON.parse(fs.readFileSync(N8N_AGENT_SHADOW_WORKFLOW.file, "utf8"));
const serialized = JSON.stringify(workflow);

describe("versioned n8n agent shadow workflow", () => {
  it("is inactive and never persists raw execution payloads", () => {
    expect(workflow.active).toBe(false);
    expect(workflow.settings.saveDataErrorExecution).toBe("none");
    expect(workflow.settings.saveDataSuccessExecution).toBe("none");
    expect(workflow.settings.saveManualExecutions).toBe(false);
    expect(workflow.meta.sisagRetention).toBe("no_execution_payloads");
  });

  it("calls only the read-only SISAG gateway", () => {
    const httpNodes = workflow.nodes.filter((node: { type: string }) => node.type === "n8n-nodes-base.httpRequest");
    expect(httpNodes).toHaveLength(1);
    expect(httpNodes[0].parameters.url).toContain(N8N_AGENT_SHADOW_WORKFLOW.allowedGatewayPath);
    for (const forbidden of ["create_appointment", "cancel_appointment", "reschedule_appointment", "/outbox", "WhatsAppSender"]) expect(serialized).not.toContain(forbidden);
  });

  it("contains credential references but no credential values", () => {
    expect(serialized).toContain("REPLACE_WITH_AGENT_SHADOW_WEBHOOK_CREDENTIAL_ID");
    expect(serialized).toContain("REPLACE_WITH_SISAG_INTERNAL_CREDENTIAL_ID");
    expect(serialized).not.toContain("PLATFORM_INTERNAL_SECRET=");
    expect(serialized).not.toContain("SISAG_INTERNAL_SECRET=");
    expect(serialized).not.toMatch(/Bearer [A-Za-z0-9_-]{12,}/);
  });

  it("rejects caller evidence and reports no side effects", () => {
    const prepare = workflow.nodes.find((node: { name: string }) => node.name === "Prepare Shadow Input");
    const response = workflow.nodes.find((node: { name: string }) => node.name === "Respond Shadow Only");
    expect(prepare.parameters.jsCode).toContain("caller_supplied_evidence_forbidden");
    expect(response.parameters.responseBody).toContain("sideEffects: 'none'");
  });
});
