import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import { agentKnowledgeDocuments } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { N8N_AGENT_RAG_POLICY, rankN8nAgentKnowledge } from "./N8nAgentKnowledgeRetriever";

export async function retrieveN8nAgentKnowledge(input: { companyId: string; query: string; now?: Date }) {
  const now = input.now ?? new Date();
  const candidates = await getDb().select({ id: agentKnowledgeDocuments.id, companyId: agentKnowledgeDocuments.companyId, scope: agentKnowledgeDocuments.scope, sourceType: agentKnowledgeDocuments.sourceType, sourceRef: agentKnowledgeDocuments.sourceRef, title: agentKnowledgeDocuments.title, content: agentKnowledgeDocuments.content, contentHash: agentKnowledgeDocuments.contentHash, version: agentKnowledgeDocuments.version, status: agentKnowledgeDocuments.status, validFrom: agentKnowledgeDocuments.validFrom, validUntil: agentKnowledgeDocuments.validUntil }).from(agentKnowledgeDocuments).where(and(eq(agentKnowledgeDocuments.companyId, input.companyId), eq(agentKnowledgeDocuments.scope, "whatsapp"), eq(agentKnowledgeDocuments.status, "approved"), lte(agentKnowledgeDocuments.validFrom, now), or(isNull(agentKnowledgeDocuments.validUntil), gt(agentKnowledgeDocuments.validUntil, now)))).limit(N8N_AGENT_RAG_POLICY.maximumCandidates);
  return rankN8nAgentKnowledge({ companyId: input.companyId, query: input.query, candidates, now });
}
