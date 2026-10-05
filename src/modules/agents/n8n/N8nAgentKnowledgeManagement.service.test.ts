import { describe, expect, it } from "vitest";
import { agentKnowledgeHash } from "./N8nAgentKnowledgeManagement.service";
describe("n8n agent knowledge management service", () => {
  it("hashes normalized content deterministically", () => { expect(agentKnowledgeHash(" conteúdo ")).toBe(agentKnowledgeHash("conteúdo")); expect(agentKnowledgeHash("conteúdo")).toMatch(/^[a-f0-9]{64}$/); });
});
