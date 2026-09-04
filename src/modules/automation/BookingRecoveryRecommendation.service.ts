import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { bookingEvents, bookingRecoveryCases, bookingRecoveryRecommendations, bookingRecoveryResponses, bookings, recoveryAgentKnowledgeDocuments } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { executeRecoveryAgent, type RecoveryAgentProvider } from "@/modules/agents/RecoveryAgentRuntime";
import { recommendRecoveryAction } from "./BookingRecoveryRecommendation.rules";
import { SisagRecoveryAgentContextRetriever } from "@/modules/agents/RecoveryAgentContextRetriever";
import { retrieveRecoveryKnowledge } from "@/modules/agents/RecoverySemanticRetriever";
import { executeVectorRetrievalShadow, type RecoveryEmbeddingProvider } from "@/modules/agents/RecoveryVectorShadow";

export { recommendRecoveryAction } from "./BookingRecoveryRecommendation.rules";
export type { RecoveryRecommendationInput } from "./BookingRecoveryRecommendation.rules";

type ShadowAgentOptions = { provider?: RecoveryAgentProvider; providerName?: string; timeoutMs?: number };
type ShadowSemanticOptions = { provider?: RecoveryEmbeddingProvider; providerName?: string; timeoutMs?: number };

function ageMinutes(date: Date | null, now: Date) {
  return date ? Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60000)) : null;
}

export class BookingRecoveryRecommendationService {
  static async generate(input: { companyId: string; caseId: string; actorId: string; agent?: ShadowAgentOptions; semantic?: ShadowSemanticOptions }) {
    const db = getDb();
    const rows = await db.select({
      caseId: bookingRecoveryCases.id,
      bookingId: bookingRecoveryCases.bookingId,
      clientId: bookingRecoveryCases.clientId,
      score: bookingRecoveryCases.score,
      priority: bookingRecoveryCases.priority,
      assignedTo: bookingRecoveryCases.assignedTo,
      caseCreatedAt: bookingRecoveryCases.createdAt,
      classification: bookingRecoveryResponses.classification,
      slaEscalatedAt: bookingRecoveryResponses.slaEscalatedAt,
      responseId: bookingRecoveryResponses.id,
      responseCreatedAt: bookingRecoveryResponses.createdAt,
      recordCompanyId: bookings.companyId,
      bookingStatus: bookings.status,
      bookingStartTime: bookings.startTime,
      bookingSource: bookings.source,
    }).from(bookingRecoveryCases)
      .innerJoin(bookings, and(eq(bookings.id, bookingRecoveryCases.bookingId), eq(bookings.companyId, input.companyId)))
      .leftJoin(bookingRecoveryResponses, and(eq(bookingRecoveryResponses.recoveryCaseId, bookingRecoveryCases.id), eq(bookingRecoveryResponses.companyId, input.companyId)))
      .where(and(eq(bookingRecoveryCases.id, input.caseId), eq(bookingRecoveryCases.companyId, input.companyId), inArray(bookingRecoveryCases.status, ["open", "contacted"])))
      .orderBy(desc(bookingRecoveryResponses.createdAt)).limit(1);
    const current = rows[0];
    if (!current) return { ok: false as const, error: "active_recovery_case_not_found" as const };

    const signals = { score: current.score, priority: current.priority, classification: current.classification ?? null, slaEscalated: Boolean(current.slaEscalatedAt), assigned: Boolean(current.assignedTo), responseId: current.responseId ?? null };
    const recommendation = recommendRecoveryAction(signals);
    const now = new Date();
    const caseAgeMinutes = ageMinutes(current.caseCreatedAt, now) ?? 0;
    const responseAgeMinutes = ageMinutes(current.responseCreatedAt, now);
    const knowledgeCandidates = await db.select({ id: recoveryAgentKnowledgeDocuments.id, companyId: recoveryAgentKnowledgeDocuments.companyId, sourceType: recoveryAgentKnowledgeDocuments.sourceType, sourceRef: recoveryAgentKnowledgeDocuments.sourceRef, title: recoveryAgentKnowledgeDocuments.title, content: recoveryAgentKnowledgeDocuments.content, contentHash: recoveryAgentKnowledgeDocuments.contentHash, version: recoveryAgentKnowledgeDocuments.version, status: recoveryAgentKnowledgeDocuments.status, validFrom: recoveryAgentKnowledgeDocuments.validFrom, validUntil: recoveryAgentKnowledgeDocuments.validUntil }).from(recoveryAgentKnowledgeDocuments).where(and(eq(recoveryAgentKnowledgeDocuments.companyId, input.companyId), eq(recoveryAgentKnowledgeDocuments.scope, "recovery"), eq(recoveryAgentKnowledgeDocuments.status, "approved"))).limit(50);
    const queryTerms=[signals.classification??"",signals.priority,current.bookingStatus,current.bookingSource,signals.slaEscalated?"sla escalated urgent":""],knowledge=retrieveRecoveryKnowledge({companyId:input.companyId,queryTerms,candidates:knowledgeCandidates,now});
    const [contextResult,vectorShadow]=await Promise.all([new SisagRecoveryAgentContextRetriever().retrieve({companyId:input.companyId,recordCompanyId:current.recordCompanyId,...signals,caseAgeMinutes,responseAgeMinutes,bookingStatus:current.bookingStatus,bookingStartTime:current.bookingStartTime,bookingSource:current.bookingSource,knowledge},now),executeVectorRetrievalShadow({companyId:input.companyId,queryTerms,candidates:knowledgeCandidates,lexical:knowledge,provider:input.semantic?.provider,providerName:input.semantic?.providerName,timeoutMs:input.semantic?.timeoutMs,now})]);
    const shadow = await executeRecoveryAgent({
      context: { ...signals, caseAgeMinutes, responseAgeMinutes, retrievedContext: contextResult.ok ? contextResult.snapshot : undefined },
      provider: input.agent?.provider,
      providerName: input.agent?.providerName,
      timeoutMs: input.agent?.timeoutMs,
      blockedReason: contextResult.ok ? undefined : "context_unavailable",
    });
    const contextMetadata = contextResult.ok ? { version: contextResult.snapshot.version, sources: contextResult.snapshot.sources, sizeChars: JSON.stringify(contextResult.snapshot).length, errorCode: null } : { version: null, sources: [], sizeChars: 0, errorCode: contextResult.errorCode };
    const agentExecution = { ...shadow.execution, context: contextMetadata, retrievalShadow: vectorShadow };

    return db.transaction(async tx => {
      const saved = await tx.insert(bookingRecoveryRecommendations).values({ companyId: input.companyId, recoveryCaseId: current.caseId, bookingId: current.bookingId, clientId: current.clientId, ...recommendation, signals, status: "shadow", engine: "recovery_rules_v1", agentDecision: shadow.decision, agentExecution })
        .onConflictDoUpdate({ target: [bookingRecoveryRecommendations.companyId, bookingRecoveryRecommendations.recoveryCaseId], set: { ...recommendation, signals, status: "shadow", engine: "recovery_rules_v1", agentDecision: shadow.decision, agentExecution, version: sql`${bookingRecoveryRecommendations.version} + 1`, updatedAt: now } })
        .returning({ id: bookingRecoveryRecommendations.id, version: bookingRecoveryRecommendations.version, suggestedAction: bookingRecoveryRecommendations.suggestedAction, suggestedPriority: bookingRecoveryRecommendations.suggestedPriority, confidence: bookingRecoveryRecommendations.confidence, rationale: bookingRecoveryRecommendations.rationale, status: bookingRecoveryRecommendations.status });
      await tx.insert(bookingEvents).values({ companyId: input.companyId, bookingId: current.bookingId, clientId: current.clientId, type: "automation.booking_recovery.recommendation_created", actor: "admin", payload: { recoveryCaseId: current.caseId, recommendationId: saved[0]!.id, version: saved[0]!.version, engine: "recovery_rules_v1", mode: "shadow", actorId: input.actorId, agentExecution, agentDecision: shadow.decision, createdAt: now.toISOString() } });
      return { ok: true as const, recommendation: saved[0] };
    });
  }
}
