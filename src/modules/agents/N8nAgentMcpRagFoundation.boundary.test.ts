import fs from "node:fs";
import { describe, expect, it } from "vitest";

const contract = fs.readFileSync("src/modules/agents/n8n/N8nAgentFoundation.contract.ts", "utf8");
const tools = fs.readFileSync("src/modules/agents/n8n/N8nAgentToolPolicy.ts", "utf8");
const doc = fs.readFileSync("docs/n8n-agent-mcp-rag-foundation.md", "utf8");

describe("n8n agent MCP RAG foundation boundary", () => {
  it("derives tenant and channel from a strict trusted envelope", () => {
    for (const value of ["trustedContext", "companyId", "whatsappAccountId", "correlationId", ".strict()"] ) expect(contract).toContain(value);
  });
  it("requires approved bounded evidence from the same tenant", () => {
    for (const value of ["status: z.literal(\"approved\")", "contentHash", "evidence.length <= 8", "item.companyId === companyId"] ) expect(contract).toContain(value);
  });
  it("keeps mutations disabled in the first stage", () => {
    expect(tools).toContain("mutation_not_enabled");
    expect(tools).toContain("requiresConfirmation: true");
    expect(doc).toContain("Nenhum workflow é ativado");
  });
  it("has no runtime, database, provider or messaging side effects", () => {
    for (const forbidden of ["getDb", "fetch(", "outbox", "BookingService", "OPENAI_API_KEY"]) expect(contract + tools).not.toContain(forbidden);
  });
});
