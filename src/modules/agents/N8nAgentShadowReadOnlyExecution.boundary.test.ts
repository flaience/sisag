import fs from "node:fs"; import { describe, expect, it } from "vitest";
const workflow = JSON.parse(fs.readFileSync("automation/n8n/workflows/sisag-agent-shadow-v4.json", "utf8"));
const schema = fs.readFileSync("src/modules/agents/n8n/N8nAgentShadowDecision.schema.ts", "utf8");
const doc = fs.readFileSync("docs/n8n-agent-shadow-read-only-execution.md", "utf8");
describe("n8n agent shadow read-only execution boundary",()=>{
  it("requires bounded structured tool arguments",()=>{for(const v of ["toolArguments","dateFrom","dateTo","limit","appointmentId"])expect(schema).toContain(v);expect(schema).toContain("invalid_slots_arguments")});
  it("executes only through the internal read-only gateway",()=>{const json=JSON.stringify(workflow);expect(json).toContain("Decision Requests Tool");expect(json).toContain("/api/platform/agents/n8n/read-only");expect(json).not.toContain("create_appointment");expect(json).not.toContain("WhatsAppSender");expect(json).toContain("value !== null && value !== undefined")});
  it("retains no tool data and produces only sanitized status",()=>{const json=JSON.stringify(workflow);for(const v of ["requested","succeeded","failed","policyVersion"])expect(json).toContain(v);for(const v of ["answerDraft: $json","data: $json","evidence: $json"])expect(json).not.toContain(v);expect(doc).toContain("não responde ao WhatsApp")});
});
