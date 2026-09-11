export type StableRetrievalObservation = { mode?: unknown; durationMs?: unknown; totalTokens?: unknown; errorCode?: unknown; release?: unknown };
export type StableCoverage = { modes: number; durations: number; tokens: number };
const rec = (v: unknown): Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const text = (v: unknown) => typeof v === "string" && v.trim().length ? v : null;
const valid = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const pct = (n: number, d: number) => d ? Number((n * 100 / d).toFixed(1)) : 0;
const avg = (v: number[]) => v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
export function summarizeRecoveryRetrievalStable(observations: StableRetrievalObservation[]) {
  const rows = observations.map(item => ({ item, release: rec(item.release) }))
    .filter(x => x.release.stable === true && text(x.release.id) && text(x.release.candidateId));
  const summarize = (items: typeof rows) => {
    const aiRuns = items.filter(x => x.item.mode === "ai").length;
    const fallbackRuns = items.filter(x => x.item.mode === "fallback").length;
    const durations = items.map(x => x.item.durationMs).filter(valid).sort((a, b) => a - b);
    const tokens = items.map(x => x.item.totalTokens).filter(valid);
    const errors = new Map<string, number>();
    for (const { item } of items) { const code = text(item.errorCode); if (code) errors.set(code, (errors.get(code) ?? 0) + 1); }
    return {
      executions: items.length, aiRuns, fallbackRuns,
      successRate: pct(aiRuns, items.length), fallbackRate: pct(fallbackRuns, items.length),
      totalTokens: tokens.length ? tokens.reduce((sum, value) => sum + value, 0) : null,
      averageTokens: avg(tokens), averageDurationMs: avg(durations),
      p95DurationMs: durations.length ? Math.round(durations[Math.ceil(durations.length * .95) - 1]!) : null,
      coverage: { modes: aiRuns + fallbackRuns, durations: durations.length, tokens: tokens.length },
      errors: [...errors].map(([errorCode, count]) => ({ errorCode, count })),
    };
  };
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = JSON.stringify([row.release.id, row.release.candidateId]);
    const group = groups.get(key) ?? [];
    group.push(row); groups.set(key, group);
  }
  return { ...summarize(rows), plans: [...groups.values()].map(items => ({
    planId: items[0]!.release.id as string, candidateId: items[0]!.release.candidateId as string, ...summarize(items),
  })) };
}
