import { describe, expect, it } from "vitest";
import { N8nAgentKnowledgeCreateSchema, N8nAgentKnowledgeStatusSchema } from "./N8nAgentKnowledgeManagement.schema";
describe("n8n agent knowledge management schemas", () => {
  it("accepts a bounded draft source", () => expect(N8nAgentKnowledgeCreateSchema.safeParse({ sourceType: "policy", sourceRef: "attendance", title: "Política de atendimento", content: "Atendimento somente com horário marcado." }).success).toBe(true));
  it("rejects oversized content and unknown fields", () => { expect(N8nAgentKnowledgeCreateSchema.safeParse({ sourceType: "policy", sourceRef: "attendance", title: "Política", content: "x".repeat(8001) }).success).toBe(false); expect(N8nAgentKnowledgeCreateSchema.safeParse({ sourceType: "policy", sourceRef: "attendance", title: "Política", content: "texto", status: "approved" }).success).toBe(false); });
  it("rejects an invalid validity window", () => expect(N8nAgentKnowledgeCreateSchema.safeParse({ sourceType: "policy", sourceRef: "attendance", title: "Política", content: "texto", validFrom: "2026-10-10", validUntil: "2026-10-09" }).success).toBe(false));
  it("allows only approve and retire transitions", () => { expect(N8nAgentKnowledgeStatusSchema.safeParse({ action: "approve" }).success).toBe(true); expect(N8nAgentKnowledgeStatusSchema.safeParse({ action: "publish" }).success).toBe(false); });
});
