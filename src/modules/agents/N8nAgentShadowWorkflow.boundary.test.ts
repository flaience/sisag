import fs from "node:fs";
import { describe, expect, it } from "vitest";

const workflowPath = "automation/n8n/workflows/sisag-agent-shadow-v1.json";
const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));
const doc = fs.readFileSync("docs/n8n-agent-shadow-workflow.md", "utf8");

describe("n8n agent shadow workflow boundary", () => {
  it("versions an importable inactive workflow", () => {
    expect(workflow.name).toBe("SISAG Agent Shadow v1");
    expect(workflow.active).toBe(false);
    expect(workflow.nodes.length).toBe(5);
    expect(workflow.connections["Record Shadow Observation"]).toBeDefined();
  });

  it("requires separate inbound and outbound credentials after import", () => {
    expect(workflow.meta.templateCredsSetupCompleted).toBe(false);
    expect(doc).toContain("duas credenciais distintas");
    expect(doc).toContain("não ativar");
  });

  it("keeps model, WhatsApp delivery and mutations outside this workflow", () => {
    for (const value of ["não chama modelo", "não envia WhatsApp", "não altera agenda"]) expect(doc).toContain(value);
  });
});
