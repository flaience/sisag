import { describe, expect, it } from "vitest";
import { executeVectorRetrievalShadow } from "./RecoveryVectorShadow";

const document = (id: string, companyId = "c") => ({ id, companyId, sourceType: "policy", sourceRef: id, title: id, content: id, contentHash: "h", version: 1, status: "approved", validFrom: new Date(0), validUntil: null });

describe("vector retrieval shadow", () => {
  it("ranks vectors without changing lexical output", async () => {
    const lexical = [{ documentId: "a", sourceType: "policy", sourceRef: "a", contentHash: "h", version: 1, excerpt: "a", score: 1 }];
    const result = await executeVectorRetrievalShadow({ companyId: "c", queryTerms: ["urgent"], candidates: [document("a"), document("b")], lexical, providerName: "test", provider: { embed: async () => ({ model: "m", totalTokens: 9, vectors: [[1, 0], [0, 1], [1, 0]] }) } });
    expect(result).toMatchObject({ mode: "ai", topDocumentIds: ["b", "a"], lexicalTopDocumentIds: ["a"], overlapRate: 100, totalTokens: 9 });
    expect(lexical[0]!.documentId).toBe("a");
  });
  it("falls back without configuration", async () => {
    const result = await executeVectorRetrievalShadow({ companyId: "c", queryTerms: [], candidates: [], lexical: [] });
    expect(result).toMatchObject({ mode: "fallback", errorCode: "embedding_provider_not_configured" });
  });
  it("normalizes provider failures", async () => {
    const result = await executeVectorRetrievalShadow({ companyId: "c", queryTerms: [], candidates: [], lexical: [], provider: { embed: async () => { throw new Error("secret"); } } });
    expect(result).toMatchObject({ mode: "fallback", errorCode: "embedding_provider_error" });
  });
  it("excludes cross-tenant candidates", async () => {
    let inputCount = 0;
    await executeVectorRetrievalShadow({ companyId: "c", queryTerms: ["x"], candidates: [document("a", "other")], lexical: [], provider: { embed: async inputs => { inputCount = inputs.length; return { model: "m", vectors: [[1]] }; } } });
    expect(inputCount).toBe(1);
  });
});
