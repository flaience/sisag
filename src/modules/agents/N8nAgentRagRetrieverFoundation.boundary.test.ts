import fs from "node:fs";
import { describe, expect, it } from "vitest";
const schema = fs.readFileSync("src/drizzle/schema.ts", "utf8");
const migration = fs.readFileSync("infra/n8n-agent-rag-retriever-foundation.sql", "utf8");
const service = fs.readFileSync("src/modules/agents/n8n/N8nAgentKnowledgeRetriever.service.ts", "utf8");
const retriever = fs.readFileSync("src/modules/agents/n8n/N8nAgentKnowledgeRetriever.ts", "utf8");
describe("n8n agent RAG retriever foundation boundary", () => {
  it("uses a dedicated governed knowledge source", () => { for (const value of ["agentKnowledgeDocuments", "agentKnowledgeAudit", ".enableRLS()"] ) expect(schema).toContain(value); expect(migration).toContain("alter table public.agent_knowledge_documents enable row level security"); });
  it("loads only approved valid tenant WhatsApp knowledge", () => { for (const value of ["companyId, input.companyId", "scope, \"whatsapp\"", "status, \"approved\"", "validFrom", "validUntil", "maximumCandidates"] ) expect(service).toContain(value); });
  it("bounds deterministic lexical evidence", () => { for (const value of ["maximumResults: 5", "maximumQueryCharacters: 1000", "maximumExcerptCharacters: 1200", "contentHash", "version"] ) expect(retriever).toContain(value); });
  it("has no embedding, model, messaging or operational capability", () => { for (const value of ["OpenAI", "embed(", "fetch(", "outbox", "WhatsAppSender", "BookingService"] ) expect(service + retriever).not.toContain(value); });
});
