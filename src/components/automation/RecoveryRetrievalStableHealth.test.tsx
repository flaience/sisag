import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StableHealthEvidence, type StableHealthData } from "./RecoveryRetrievalStableHealth";
import { evaluateRecoveryRetrievalStableHealth } from "@/modules/agents/RecoveryRetrievalStableHealthGate";

const metric = (overrides = {}) => ({ planId: "plan-1", candidateId: "candidate-1", executions: 50, successRate: 99, fallbackRate: 1, p95DurationMs: 800, averageTokens: 900, ...overrides });
const render = (current = [metric()], previous = [metric()]) => {
  const data: StableHealthData = {
    period: { days: 30, from: "2026-08-11T00:00:00Z", to: "2026-09-10T00:00:00Z" },
    previousPeriod: { days: 30, from: "2026-07-12T00:00:00Z", to: "2026-08-11T00:00:00Z" },
    health: evaluateRecoveryRetrievalStableHealth({ current, previous }), readOnly: true, automaticAction: false,
  };
  return renderToStaticMarkup(<StableHealthEvidence data={data} />);
};
describe("stable health evidence UI", () => {
  it.each([
    [{}, "Saudável"],
    [{ executions: 49 }, "Dados insuficientes"],
    [{ p95DurationMs: 2500 }, "Degradado"],
    [{ successRate: 80 }, "Crítico"],
  ])("shows the server classification", (change, label) => expect(render([metric(change)])).toContain(label));
  it("shows plan, candidate, sample and policy", () => {
    const html = render();
    for (const text of ["plan-1", "candidate-1", "50 execuções", "mínimo da política: 50", "recovery_retrieval_stable_health_v1"]) expect(html).toContain(text);
  });
  it("shows absent baseline as not evaluated", () => {
    const html = render([metric()], [metric({ candidateId: "other" })]);
    expect(html).toContain("Sem histórico comparável");
    expect(html.match(/Não avaliado/g)).toHaveLength(2);
  });
  it("explains violations and displays observed values", () => {
    const html = render([metric({ p95DurationMs: 2500 })]);
    expect(html).toContain("Fora dos limites: Latência p95 (ms)");
    expect(html).toContain("2500");
    expect(html).toContain("2000");
    expect(html).toContain("revisão humana");
    expect(html).not.toContain("<button");
  });
  it("handles no observations without claiming healthy", () => {
    const html = render([]);
    expect(html).toContain("Nenhum plano com execução estável");
    expect(html).not.toContain("Saudável");
  });
});
