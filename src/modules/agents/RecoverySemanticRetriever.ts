export const RECOVERY_SEMANTIC_MAX_DOCUMENTS = 3;
export const RECOVERY_SEMANTIC_MAX_EXCERPT_CHARS = 400;

export type RecoveryKnowledgeDocument = { id: string; companyId: string; sourceType: string; sourceRef: string; title: string; content: string; contentHash: string; version: number; status: string; validFrom: Date; validUntil: Date | null };
export type RecoveryKnowledgeExcerpt = { documentId: string; sourceType: string; sourceRef: string; contentHash: string; version: number; excerpt: string; score: number };

const tokens = (value: string) => new Set(value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9]{3,}/g) ?? []);

export function retrieveRecoveryKnowledge(input: { companyId: string; queryTerms: string[]; candidates: RecoveryKnowledgeDocument[]; now?: Date }): RecoveryKnowledgeExcerpt[] {
  const now = input.now ?? new Date(), query = tokens(input.queryTerms.join(" "));
  return input.candidates
    .filter(document => document.companyId === input.companyId && document.status === "approved" && document.validFrom <= now && (!document.validUntil || document.validUntil > now) && document.content.trim().length > 0 && document.content.length <= 2000)
    .map(document => { const title = tokens(document.title), content = tokens(document.content); let score = 0; for (const term of query) score += (title.has(term) ? 2 : 0) + (content.has(term) ? 1 : 0); return { document, score }; })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.document.id.localeCompare(b.document.id))
    .slice(0, RECOVERY_SEMANTIC_MAX_DOCUMENTS)
    .map(({ document, score }) => ({ documentId: document.id, sourceType: document.sourceType, sourceRef: document.sourceRef, contentHash: document.contentHash, version: document.version, excerpt: document.content.trim().slice(0, RECOVERY_SEMANTIC_MAX_EXCERPT_CHARS), score }));
}
