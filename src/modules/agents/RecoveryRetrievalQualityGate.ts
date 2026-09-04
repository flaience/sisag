export const RECOVERY_RETRIEVAL_QUALITY_POLICY = {
  version: "recovery_retrieval_quality_v2",
  minimumExecutions: 30,
  minimumHumanComparisons: 10,
  minimumAvailabilityRate: 95,
  maximumFallbackRate: 5,
  maximumP95DurationMs: 2000,
  maximumAverageTokens: 5000,
  minimumAverageOverlapRate: 50,
  minimumHumanAgreementRate: 70,
  minimumVectorEvaluations: 20,
  minimumVectorRelevanceScore: 70,
  minimumVectorVsLexicalDelta: -5,
} as const;

export type RecoveryRetrievalQualityMetrics = {
  executions: number;
  vectorRuns: number;
  fallbackRuns: number;
  availabilityRate: number;
  fallbackRate: number;
  p95DurationMs: number;
  averageTokens: number;
  averageOverlapRate: number;
  humanComparisons: number;
  humanAgreementRate: number;
  vectorEvaluations: number;
  vectorRelevanceScore: number;
  vectorVsLexicalDelta: number;
};

type Check = {
  code: string;
  passed: boolean;
  actual: number;
  operator: "gte" | "lte";
  threshold: number;
  evidence: "retrieval" | "workflow_correlation";
};

export function evaluateRecoveryRetrievalQuality(metrics: RecoveryRetrievalQualityMetrics) {
  const policy = RECOVERY_RETRIEVAL_QUALITY_POLICY;
  const enoughData = metrics.executions >= policy.minimumExecutions && metrics.humanComparisons >= policy.minimumHumanComparisons && metrics.vectorEvaluations >= policy.minimumVectorEvaluations;
  const checks: Check[] = [
    { code: "availability_rate", passed: metrics.availabilityRate >= policy.minimumAvailabilityRate, actual: metrics.availabilityRate, operator: "gte", threshold: policy.minimumAvailabilityRate, evidence: "retrieval" },
    { code: "fallback_rate", passed: metrics.fallbackRate <= policy.maximumFallbackRate, actual: metrics.fallbackRate, operator: "lte", threshold: policy.maximumFallbackRate, evidence: "retrieval" },
    { code: "p95_duration_ms", passed: metrics.p95DurationMs <= policy.maximumP95DurationMs, actual: metrics.p95DurationMs, operator: "lte", threshold: policy.maximumP95DurationMs, evidence: "retrieval" },
    { code: "average_tokens", passed: metrics.averageTokens <= policy.maximumAverageTokens, actual: metrics.averageTokens, operator: "lte", threshold: policy.maximumAverageTokens, evidence: "retrieval" },
    { code: "lexical_overlap_rate", passed: metrics.averageOverlapRate >= policy.minimumAverageOverlapRate, actual: metrics.averageOverlapRate, operator: "gte", threshold: policy.minimumAverageOverlapRate, evidence: "retrieval" },
    { code: "human_outcome_agreement", passed: metrics.humanAgreementRate >= policy.minimumHumanAgreementRate, actual: metrics.humanAgreementRate, operator: "gte", threshold: policy.minimumHumanAgreementRate, evidence: "workflow_correlation" },
    { code: "vector_human_relevance", passed: metrics.vectorRelevanceScore >= policy.minimumVectorRelevanceScore, actual: metrics.vectorRelevanceScore, operator: "gte", threshold: policy.minimumVectorRelevanceScore, evidence: "retrieval" },
    { code: "vector_vs_lexical_delta", passed: metrics.vectorVsLexicalDelta >= policy.minimumVectorVsLexicalDelta, actual: metrics.vectorVsLexicalDelta, operator: "gte", threshold: policy.minimumVectorVsLexicalDelta, evidence: "retrieval" },
  ];
  const status = !enoughData ? "insufficient_data" : checks.every(check => check.passed) ? "eligible" : "keep_shadow";
  const reasons = !enoughData
    ? [`minimum_executions:${metrics.executions}/${policy.minimumExecutions}`, `minimum_human_comparisons:${metrics.humanComparisons}/${policy.minimumHumanComparisons}`, `minimum_vector_evaluations:${metrics.vectorEvaluations}/${policy.minimumVectorEvaluations}`]
    : checks.filter(check => !check.passed).map(check => `${check.code}:${check.actual}:${check.operator}:${check.threshold}`);
  return {
    status,
    policyVersion: policy.version,
    automaticPromotion: false,
    interpretation: "eligible means ready for human review; it never promotes retrieval automatically",
    humanEvidenceNote: "workflow agreement remains correlational; vector relevance uses direct human labels",
    sample: { executions: metrics.executions, humanComparisons: metrics.humanComparisons, vectorEvaluations: metrics.vectorEvaluations },
    checks,
    reasons,
  } as const;
}
