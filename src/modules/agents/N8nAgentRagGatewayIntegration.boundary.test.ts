import fs from "node:fs";
import { describe, expect, it } from "vitest";

const route = fs.readFileSync("src/app/api/platform/agents/n8n/read-only/route.ts", "utf8");
const service = fs.readFileSync("src/modules/agents/n8n/N8nAgentReadOnlyGateway.service.ts", "utf8");
const retriever = fs.readFileSync("src/modules/agents/n8n/N8nAgentKnowledgeRetriever.service.ts", "utf8");
const doc = fs.readFileSync("docs/n8n-agent-rag-gateway-integration.md", "utf8");

describe("n8n agent RAG gateway integration", () => {
  it("connects the approved tenant-safe retriever to the gateway", () => {
    expect(route).toContain("retrieveKnowledge: retrieveN8nAgentKnowledge");
    expect(retriever).toContain('eq(agentKnowledgeDocuments.companyId, input.companyId)');
    expect(retriever).toContain('eq(agentKnowledgeDocuments.status, "approved")');
  });

  it("returns immutable evidence references with the tool result", () => {
    for (const value of ["documentId", "version", "contentHash", "title", "excerpt"]) expect(service).toContain(value);
  });

  it("keeps the rollout inactive and read-only", () => {
    expect(doc).toContain("workflow n8n permanece inativo");
    expect(doc).toContain("nenhuma mutação de agenda");
    expect(doc).toContain("não envia mensagens");
  });
});
