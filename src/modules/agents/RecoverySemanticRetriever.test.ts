import { describe, expect, it } from "vitest";
import { retrieveRecoveryKnowledge } from "./RecoverySemanticRetriever";

const now = new Date("2026-09-03T12:00:00Z");
type Document = Parameters<typeof retrieveRecoveryKnowledge>[0]["candidates"][number];
const document = (overrides: Partial<Document> = {}): Document => ({ id: "a", companyId: "company-a", sourceType: "policy", sourceRef: "recovery-1", title: "Recuperação urgente", content: "Casos negativos exigem acolhimento humano prioritário.", contentHash: "hash", version: 1, status: "approved", validFrom: new Date("2026-01-01"), validUntil: null, ...overrides });

describe("recovery semantic retrieval", () => {
  it("ranks approved tenant documents deterministically", () => { const result = retrieveRecoveryKnowledge({ companyId: "company-a", queryTerms: ["negativo urgente"], candidates: [document(), document({ id: "b", title: "Rotina geral", content: "Informação sem relação." })], now }); expect(result).toHaveLength(1); expect(result[0]).toMatchObject({ documentId: "a", sourceType: "policy", version: 1 }); });
  it("rejects cross-tenant, draft and expired documents", () => { const result = retrieveRecoveryKnowledge({ companyId: "company-a", queryTerms: ["urgente"], candidates: [document({ companyId: "company-b" }), document({ id: "b", status: "draft" }), document({ id: "c", validUntil: new Date("2026-01-02") })], now }); expect(result).toEqual([]); });
  it("bounds results and excerpts", () => { const candidates = [1,2,3,4].map(value => document({ id: String(value), content: `Urgente ${"x".repeat(800)}` })); const result = retrieveRecoveryKnowledge({ companyId: "company-a", queryTerms: ["urgente"], candidates, now }); expect(result).toHaveLength(3); expect(result.every(item => item.excerpt.length <= 400)).toBe(true); });
});
