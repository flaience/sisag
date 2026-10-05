export const N8N_AGENT_RAG_POLICY = { version: "n8n_agent_rag_lexical_v1", maximumCandidates: 50, maximumResults: 5, maximumQueryCharacters: 1000, maximumExcerptCharacters: 1200 } as const;
export type AgentKnowledgeCandidate = { id: string; companyId: string; scope: string; sourceType: string; sourceRef: string; title: string; content: string; contentHash: string; version: number; status: string; validFrom: Date; validUntil: Date | null };

const tokens = (value: string) => new Set(value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9]{3,}/g) ?? []);

export function rankN8nAgentKnowledge(input: { companyId: string; query: string; candidates: AgentKnowledgeCandidate[]; now?: Date }) {
  const policy = N8N_AGENT_RAG_POLICY, now = input.now ?? new Date(), query = tokens(input.query.slice(0, policy.maximumQueryCharacters));
  return input.candidates
    .slice(0, policy.maximumCandidates)
    .filter((document) => document.companyId === input.companyId && document.scope === "whatsapp" && document.status === "approved" && document.validFrom <= now && (!document.validUntil || document.validUntil > now) && document.content.trim().length > 0)
    .map((document) => { const title = tokens(document.title), content = tokens(document.content); let score = 0; for (const term of query) score += (title.has(term) ? 3 : 0) + (content.has(term) ? 1 : 0); return { document, score }; })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.document.id.localeCompare(b.document.id))
    .slice(0, policy.maximumResults)
    .map(({ document, score }) => ({ companyId: document.companyId, documentId: document.id, version: document.version, contentHash: document.contentHash, status: "approved" as const, title: document.title, excerpt: document.content.trim().slice(0, policy.maximumExcerptCharacters), score }));
}
