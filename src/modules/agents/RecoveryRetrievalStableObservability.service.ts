import { and, desc, eq, gte, lte } from "drizzle-orm";
import { bookingRecoveryRecommendations } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { summarizeRecoveryRetrievalStable, type StableRetrievalObservation } from "./RecoveryRetrievalStableMetrics";

export const STABLE_OBSERVATION_LIMIT = 10000;
const rec = (v: unknown): Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const delta = (a: number | null, b: number | null, complete: boolean) => complete && a !== null && b !== null ? Number((a - b).toFixed(1)) : null;
export class RecoveryRetrievalStableObservabilityService {
  static async get(input: { companyId: string; days?: number; now?: Date }) {
    const raw = input.days ?? 30;
    const days = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 1), 90) : 30;
    const now = input.now ?? new Date();
    const currentFrom = new Date(now.getTime() - days * 86400000);
    const previousFrom = new Date(currentFrom.getTime() - days * 86400000);
    const rows = await getDb().select({
      agentExecution: bookingRecoveryRecommendations.agentExecution,
      createdAt: bookingRecoveryRecommendations.createdAt,
    }).from(bookingRecoveryRecommendations).where(and(
      eq(bookingRecoveryRecommendations.companyId, input.companyId),
      gte(bookingRecoveryRecommendations.createdAt, previousFrom),
      lte(bookingRecoveryRecommendations.createdAt, now),
    )).orderBy(desc(bookingRecoveryRecommendations.createdAt), desc(bookingRecoveryRecommendations.id))
      .limit(STABLE_OBSERVATION_LIMIT + 1);
    // The extra row detects truncation before filtering stable observations.
    const complete = rows.length <= STABLE_OBSERVATION_LIMIT;
    const mapped = rows.slice(0, STABLE_OBSERVATION_LIMIT).map(row => ({
      createdAt: row.createdAt,
      retrieval: rec(rec(row.agentExecution).retrievalShadow) as StableRetrievalObservation,
    }));
    const current = summarizeRecoveryRetrievalStable(mapped.filter(x => x.createdAt >= currentFrom).map(x => x.retrieval));
    const previous = summarizeRecoveryRetrievalStable(mapped.filter(x => x.createdAt < currentFrom).map(x => x.retrieval));
    const durationComplete = complete && current.coverage.durations === current.executions && previous.coverage.durations === previous.executions;
    const tokensComplete = complete && current.coverage.tokens === current.executions && previous.coverage.tokens === previous.executions;
    const modesComplete = complete && current.coverage.modes === current.executions && previous.coverage.modes === previous.executions;
    return {
      period: { days, from: currentFrom.toISOString(), to: now.toISOString() },
      previousPeriod: { days, from: previousFrom.toISOString(), to: currentFrom.toISOString() },
      completeness: { complete, limit: STABLE_OBSERVATION_LIMIT, sampledRows: mapped.length },
      current, previous,
      comparison: {
        executionsDelta: delta(current.executions, previous.executions, complete),
        successRateDelta: delta(current.successRate, previous.successRate, modesComplete),
        fallbackRateDelta: delta(current.fallbackRate, previous.fallbackRate, modesComplete),
        averageDurationMsDelta: delta(current.averageDurationMs, previous.averageDurationMs, durationComplete),
        averageTokensDelta: delta(current.averageTokens, previous.averageTokens, tokensComplete),
      },
      readOnly: true as const, automaticRollback: false as const,
    };
  }
}
