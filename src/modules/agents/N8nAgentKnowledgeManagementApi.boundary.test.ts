import fs from "node:fs";
import { describe, expect, it } from "vitest";
const service = fs.readFileSync("src/modules/agents/n8n/N8nAgentKnowledgeManagement.service.ts", "utf8");
const route = fs.readFileSync("src/app/api/v1/settings/agent-knowledge/route.ts", "utf8");
const status = fs.readFileSync("src/app/api/v1/settings/agent-knowledge/[id]/status/route.ts", "utf8");
describe("n8n agent knowledge management API boundary", () => {
  it("derives tenant and actor only from authenticated owner or admin", () => { for (const source of [route, status]) { expect(source).toContain("requireApiRole"); expect(source).toContain("auth.auth.companyId"); expect(source).toContain("auth.auth.userId"); expect(source).toContain("[\"owner\", \"admin\"]"); } });
  it("creates immutable versioned drafts with hash and audit", () => { for (const value of ["agentKnowledgeHash", "version: (previous[0]?.version ?? 0) + 1", "status: \"draft\"", "agentKnowledgeAudit", "action: \"created\""]) expect(service).toContain(value); });
  it("allows only guarded approval and retirement", () => { expect(service).toContain("input.action === \"approve\" ? \"draft\" : \"approved\""); expect(service).toContain("input.action === \"approve\" ? \"approved\" : \"retired\""); expect(status).toContain("invalid_agent_knowledge_transition"); });
  it("keeps provider, workflow, messaging and booking effects outside", () => { for (const value of ["OpenAI", "fetch(", "outbox", "WhatsAppSender", "BookingService", "n8n.flaience.com"]) expect(service + route + status).not.toContain(value); });
});
