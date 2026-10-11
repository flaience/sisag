import fs from "node:fs"; import { describe, expect, it } from "vitest";
const workflow = JSON.parse(fs.readFileSync("automation/n8n/workflows/sisag-agent-shadow-v5.json", "utf8"));
const route = fs.readFileSync("src/app/api/v1/whatsapp/webhook/route.ts", "utf8");
const observation = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowMirrorObservation.service.ts", "utf8");
const doc = fs.readFileSync("docs/n8n-agent-shadow-answer-candidate.md", "utf8");
describe("n8n agent shadow answer candidate boundary", () => {
  it("creates a candidate only after successful read-only execution", () => { const json = JSON.stringify(workflow); expect(json).toContain("Build Answer Candidate"); expect(workflow.connections["Execute SISAG Read Only Tool"].main[0][0].node).toBe("Build Answer Candidate"); expect(json).toContain("gateway?.data?.ok === true"); expect(json).toContain("toolResult: gateway"); expect(json).toContain("const gateway = observed.toolResult"); expect(json).toContain("SCHEDULING_RESOURCE_NOT_FOUND"); expect(json).toContain("Para qual serviço ou profissional"); });
  it("does not dispatch or mutate", () => { const json = JSON.stringify(workflow); expect(json).not.toContain("WhatsAppSender"); expect(json).not.toContain("create_appointment"); expect(doc).toContain("não é enviada ao WhatsApp"); });
  it("does not persist candidate text or slots", () => { expect(route).not.toContain("answerCandidate:"); expect(observation).not.toContain("answerCandidate"); expect(observation).not.toContain("slotCount"); });
});
