import fs from "node:fs";
import { describe, expect, it } from "vitest";

const workflowPath = "automation/n8n/workflows/sisag-agent-shadow-v1.json";
const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));
const serialized = JSON.stringify(workflow);
const contract = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowWorkflow.ts", "utf8");
const readme = fs.readFileSync("automation/n8n/README.md", "utf8");

describe("n8n agent shadow import compatibility", () => {
  it("uses the established repository location and literal production URL", () => {
    expect(contract).toContain(workflowPath);
    const gateway = workflow.nodes.find((node: { name: string }) => node.name === "Call SISAG Read Only Gateway");
    expect(gateway.parameters.url).toBe("https://sisag.flaience.com/api/platform/agents/n8n/read-only");
    expect(serialized).not.toContain("$env");
  });

  it("marks both separate credential bindings without storing secrets", () => {
    expect(serialized).toContain("REPLACE_WITH_AGENT_SHADOW_WEBHOOK_CREDENTIAL_ID");
    expect(serialized).toContain("REPLACE_WITH_SISAG_INTERNAL_CREDENTIAL_ID");
    expect(serialized).toContain("SISAG Agent Shadow Webhook");
    expect(serialized).toContain("SISAG Internal API");
    expect(serialized).not.toMatch(/Bearer [A-Za-z0-9_-]{12,}/);
  });

  it("documents test-mode setup while keeping production inactive", () => {
    expect(readme).toContain("Agente WhatsApp em modo sombra");
    expect(readme).toContain("duas credenciais Header Auth distintas");
    expect(readme).toContain("Mantenha o workflow inativo");
    expect(workflow.active).toBe(false);
  });
});
