import { and, eq, gte, lte } from "drizzle-orm";
import { bookingRecoveryRecommendations, recoveryAgentRetrievalEvaluations } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { evaluateRecoveryRetrievalQuality } from "@/modules/agents/RecoveryRetrievalQualityGate";
import { summarizeRecoveryRetrievalEvaluations, type RetrievalEvaluationRow } from "@/modules/agents/RecoveryRetrievalEvaluationMetrics";

export const pct = (n: number, d: number) => d ? Number((n * 100 / d).toFixed(1)) : 0;
const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
const numberOrZero = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === "string" && value.length ? value : null;
const percentile95 = (values: number[]) => values.length ? [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1]! : 0;

type OutcomeRow = {
  status: string;
  engine: string;
  confidence: number;
  suggestedAction: string;
  suggestedPriority: string;
  decidedAction: string | null;
  decidedPriority: string | null;
  agentDecision: unknown;
  agentExecution: unknown;
  createdAt: Date;
  reviewedAt: Date | null;
};

export function summarizeAgentObservability(rows: OutcomeRow[], evaluationRows: RetrievalEvaluationRow[] = []) {
  const reviewed = rows.filter(item => item.status !== "shadow");
  const accepted = rows.filter(item => item.status === "accepted").length;
  const adjusted = rows.filter(item => item.status === "adjusted").length;
  const rejected = rows.filter(item => item.status === "rejected").length;
  const deterministicHumanAgreement = reviewed.filter(item => item.status === "accepted" || (item.status === "adjusted" && item.suggestedAction === item.decidedAction && item.suggestedPriority === item.decidedPriority)).length;
  const executions = rows.map(item => ({ item, decision: record(item.agentDecision), execution: record(item.agentExecution) })).filter(item => text(item.execution.mode));
  const aiRuns = executions.filter(item => item.execution.mode === "ai").length;
  const fallbackRuns = executions.filter(item => item.execution.mode === "fallback").length;
  const agentDeterministicComparable = executions.filter(({ decision }) => text(decision.suggestedAction) && text(decision.suggestedPriority));
  const agentDeterministicAgreement = agentDeterministicComparable.filter(({ item, decision }) => decision.suggestedAction === item.suggestedAction && decision.suggestedPriority === item.suggestedPriority).length;
  const agentHumanComparable = executions.filter(({ item, decision }) => item.status !== "shadow" && item.decidedAction && item.decidedPriority && text(decision.suggestedAction) && text(decision.suggestedPriority));
  const agentHumanAgreement = agentHumanComparable.filter(({ item, decision }) => decision.suggestedAction === item.decidedAction && decision.suggestedPriority === item.decidedPriority).length;
  const durations = executions.map(({ execution }) => numberOrZero(execution.durationMs));
  const inputTokens = executions.reduce((sum, { execution }) => sum + numberOrZero(execution.inputTokens), 0);
  const outputTokens = executions.reduce((sum, { execution }) => sum + numberOrZero(execution.outputTokens), 0);
  const errors = [...new Set(executions.map(({ execution }) => text(execution.errorCode)).filter((value): value is string => Boolean(value)))].map(errorCode => ({ errorCode, count: executions.filter(({ execution }) => execution.errorCode === errorCode).length }));
  const providerKeys = [...new Set(executions.map(({ execution }) => `${text(execution.provider) ?? "none"}::${text(execution.model) ?? "none"}`))];
  const retrievals=executions.map(({execution})=>record(execution.retrievalShadow)).filter(item=>text(item.mode));
  const retrievalDurations = retrievals.map(item => numberOrZero(item.durationMs));
  const vectorRuns = retrievals.filter(item => item.mode === "ai").length;
  const retrievalFallbackRuns = retrievals.filter(item => item.mode === "fallback").length;
  const retrievalTokens = retrievals.reduce((sum, item) => sum + numberOrZero(item.totalTokens), 0);
  const averageOverlapRate = average(retrievals.filter(item => item.mode === "ai").map(item => numberOrZero(item.overlapRate)));
  const humanRetrieval = summarizeRecoveryRetrievalEvaluations(evaluationRows);
  const retrievalQuality = evaluateRecoveryRetrievalQuality({
    executions: retrievals.length,
    vectorRuns,
    fallbackRuns: retrievalFallbackRuns,
    availabilityRate: pct(vectorRuns, retrievals.length),
    fallbackRate: pct(retrievalFallbackRuns, retrievals.length),
    p95DurationMs: Math.round(percentile95(retrievalDurations)),
    averageTokens: average(retrievals.map(item => numberOrZero(item.totalTokens))),
    averageOverlapRate,
    humanComparisons: agentHumanComparable.length,
    humanAgreementRate: pct(agentHumanAgreement, agentHumanComparable.length),
    vectorEvaluations: humanRetrieval.vector.evaluations,
    vectorRelevanceScore: humanRetrieval.vector.relevanceScore,
    vectorVsLexicalDelta: humanRetrieval.delta,
  });
  const providers = providerKeys.map(key => {
    const [provider, model] = key.split("::");
    const items = executions.filter(({ execution }) => `${text(execution.provider) ?? "none"}::${text(execution.model) ?? "none"}` === key);
    return { provider, model, total: items.length, aiRuns: items.filter(({ execution }) => execution.mode === "ai").length, fallbackRuns: items.filter(({ execution }) => execution.mode === "fallback").length, averageDurationMs: average(items.map(({ execution }) => numberOrZero(execution.durationMs))), totalTokens: items.reduce((sum, { execution }) => sum + numberOrZero(execution.inputTokens) + numberOrZero(execution.outputTokens), 0) };
  });
  const reviewMinutes = reviewed.filter(item => item.reviewedAt).map(item => Math.max(0, (item.reviewedAt!.getTime() - item.createdAt.getTime()) / 60000));
  const engines = [...new Set(rows.map(item => item.engine))].map(engine => { const items = rows.filter(item => item.engine === engine), done = items.filter(item => item.status !== "shadow"); return { engine, total: items.length, reviewed: done.length, acceptanceRate: pct(done.filter(item => item.status === "accepted").length, done.length), averageConfidence: average(done.map(item => item.confidence)) }; });
  return {
    summary: { total: rows.length, pending: rows.length - reviewed.length, reviewed: reviewed.length, accepted, adjusted, rejected, acceptanceRate: pct(accepted, reviewed.length), agreementRate: pct(deterministicHumanAgreement, reviewed.length), averageConfidence: average(reviewed.map(item => item.confidence)), averageReviewMinutes: average(reviewMinutes) },
    agent: { executions: executions.length, aiRuns, fallbackRuns, aiRate: pct(aiRuns, executions.length), fallbackRate: pct(fallbackRuns, executions.length), agentDeterministicAgreementRate: pct(agentDeterministicAgreement, agentDeterministicComparable.length), agentHumanAgreementRate: pct(agentHumanAgreement, agentHumanComparable.length), humanComparisons: agentHumanComparable.length, inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, averageDurationMs: average(durations), p95DurationMs: Math.round(percentile95(durations)) },
    retrieval:{executions:retrievals.length,vectorRuns,fallbackRuns:retrievalFallbackRuns,availabilityRate:pct(vectorRuns,retrievals.length),fallbackRate:pct(retrievalFallbackRuns,retrievals.length),averageOverlapRate,totalTokens:retrievalTokens,averageTokens:average(retrievals.map(x=>numberOrZero(x.totalTokens))),averageDurationMs:average(retrievalDurations),p95DurationMs:Math.round(percentile95(retrievalDurations)),errors:[...new Set(retrievals.map(x=>text(x.errorCode)).filter((x):x is string=>Boolean(x)))].map(errorCode=>({errorCode,count:retrievals.filter(x=>x.errorCode===errorCode).length})),humanEvaluation:humanRetrieval,qualityGate:retrievalQuality},
    providers,
    errors,
    engines,
  };
}

export class BookingRecoveryAgentOutcomesService {
  static async get(input: { companyId: string; days?: number; now?: Date }) {
    const db = getDb(), now = input.now ?? new Date(), days = Math.min(Math.max(input.days ?? 30, 1), 365), from = new Date(now.getTime() - days * 86400000);
    const [rows,evaluationRows] = await Promise.all([db.select({ status: bookingRecoveryRecommendations.status, engine: bookingRecoveryRecommendations.engine, confidence: bookingRecoveryRecommendations.confidence, suggestedAction: bookingRecoveryRecommendations.suggestedAction, suggestedPriority: bookingRecoveryRecommendations.suggestedPriority, decidedAction: bookingRecoveryRecommendations.decidedAction, decidedPriority: bookingRecoveryRecommendations.decidedPriority, agentDecision: bookingRecoveryRecommendations.agentDecision, agentExecution: bookingRecoveryRecommendations.agentExecution, createdAt: bookingRecoveryRecommendations.createdAt, reviewedAt: bookingRecoveryRecommendations.reviewedAt }).from(bookingRecoveryRecommendations).where(and(eq(bookingRecoveryRecommendations.companyId, input.companyId), gte(bookingRecoveryRecommendations.createdAt, from), lte(bookingRecoveryRecommendations.createdAt, now))).limit(5000),db.select({recommendationId:recoveryAgentRetrievalEvaluations.recommendationId,recommendationVersion:recoveryAgentRetrievalEvaluations.recommendationVersion,strategy:recoveryAgentRetrievalEvaluations.strategy,rank:recoveryAgentRetrievalEvaluations.rank,relevance:recoveryAgentRetrievalEvaluations.relevance}).from(recoveryAgentRetrievalEvaluations).where(and(eq(recoveryAgentRetrievalEvaluations.companyId,input.companyId),gte(recoveryAgentRetrievalEvaluations.createdAt,from),lte(recoveryAgentRetrievalEvaluations.createdAt,now))).limit(10000)]);
    return { period: { days, from: from.toISOString(), to: now.toISOString() }, ...summarizeAgentObservability(rows,evaluationRows) };
  }
}
