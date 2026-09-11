"use client";

import React, { useEffect, useState } from "react";
import type { RecoveryRetrievalStableHealthService } from "@/modules/agents/RecoveryRetrievalStableHealth.service";

export type StableHealthData = Awaited<ReturnType<typeof RecoveryRetrievalStableHealthService.get>>;
const statuses: Record<string, string> = {
  insufficient_data: "Dados insuficientes",
  healthy: "Saudável",
  degraded: "Degradado",
  critical: "Crítico",
};
const labels: Record<string, string> = {
  success_rate: "Taxa de sucesso (%)",
  fallback_rate: "Taxa de fallback (%)",
  p95_duration_ms: "Latência p95 (ms)",
  average_tokens: "Tokens médios",
  success_rate_drop: "Queda no sucesso (p.p.)",
  fallback_rate_increase: "Aumento do fallback (p.p.)",
};
const date = (value: string) => new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });

export function StableHealthEvidence({ data }: { data: StableHealthData }) {
  return <div className="space-y-4">
    <p className="text-sm" role="status">{data.health.complete ? "Janela de consulta completa." : "Consulta incompleta: avaliação inconclusiva. Reduza o período para obter uma janela completa."}</p>
    <p className="text-sm">Política: <span className="font-mono">{data.health.policyVersion}</span></p>
    <p className="text-sm text-slate-600">Atual: {date(data.period.from)}–{date(data.period.to)} · anterior: {date(data.previousPeriod.from)}–{date(data.previousPeriod.to)}.</p>
    {!data.health.plans.length ? <p>Nenhum plano com execução estável no período.</p> : data.health.plans.map(plan => {
      const failed = plan.checks.filter(check => check.passed === false);
      return <article key={plan.planId + ":" + plan.candidateId} className="space-y-3 rounded-xl border p-4">
        <div className="flex flex-wrap justify-between gap-2">
          <h3 className="font-semibold break-all">Plano {plan.planId}</h3>
          <span className={"rounded-full px-3 py-1 text-sm " + (plan.status === "healthy" ? "bg-emerald-100 text-emerald-900" : plan.status === "critical" ? "bg-red-100 text-red-900" : "bg-amber-100 text-amber-900")}>{statuses[plan.status] ?? "Classificação indisponível"}</span>
        </div>
        <p className="break-all text-sm">Candidato {plan.candidateId}</p>
        <p className="text-sm">Amostra atual: {plan.sample.executions} execuções · mínimo da política: {plan.sample.minimumExecutions}.</p>
        <p className="text-sm">{plan.baseline.available ? "Comparação com o mesmo plano e candidato: " + plan.baseline.executions + " execuções no período anterior." : "Sem histórico comparável suficiente para este plano e candidato (" + plan.baseline.executions + "/" + plan.baseline.minimumExecutions + " execuções). Regressões não avaliadas."}</p>
        {plan.status === "insufficient_data" ? <p className="text-sm">Evidência insuficiente para concluir sobre a saúde.</p> : failed.length ? <p className="text-sm">Fora dos limites: {failed.map(check => labels[check.code] ?? check.code).join(", ")}.</p> : <p className="text-sm">Os indicadores avaliados atendem aos limites da política.</p>}
        <p className="text-sm">Medições válidas: duração {plan.coverage.durations}/{plan.sample.executions} · tokens {plan.coverage.tokens}/{plan.sample.executions} · modos {plan.coverage.modes}/{plan.sample.executions}.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Evidências da avaliação do plano {plan.planId}</caption>
            <thead><tr><th scope="col" className="p-2">Indicador</th><th scope="col" className="p-2">Observado</th><th scope="col" className="p-2">Limite</th><th scope="col" className="p-2">Resultado</th></tr></thead>
            <tbody>{plan.checks.map(check => <tr key={check.code} className="border-t">
              <th scope="row" className="p-2 font-normal">{labels[check.code] ?? check.code}</th>
              <td className="p-2">{!check.evaluated ? "—" : check.actual}</td>
              <td className="p-2">{check.operator === "gte" ? "≥" : "≤"} {check.threshold}</td>
              <td className="p-2">{!check.evaluated ? "Não avaliado" : check.passed ? "Dentro do limite" : "Fora do limite"}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </article>;
    })}
    <p className="text-xs text-slate-600">Avaliação somente leitura. Sinais de degradação exigem revisão humana e não executam rollback automaticamente.</p>
  </div>;
}

export default function RecoveryRetrievalStableHealth({ days }: { days: number }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ days: number; data?: StableHealthData; error?: boolean } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setResult(null);
    void (async () => {
      try {
        const response = await fetch("/api/v1/settings/booking-followups/recovery/agent-outcomes/stable-release/health?days=" + days, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("health_unavailable");
        const data: StableHealthData = await response.json();
        if (active) setResult({ days, data });
      } catch {
        if (active) setResult({ days, error: true });
      }
    })();
    return () => { active = false; controller.abort(); };
  }, [days, attempt]);
  return <section aria-labelledby="stable-health-title" className="space-y-4 rounded-2xl border bg-white p-4">
    <h2 id="stable-health-title" className="text-lg font-semibold">Saúde do retrieval estável</h2>
    {!result || result.days !== days ? <p role="status">Carregando avaliação de saúde…</p> : result.error || !result.data ? <div role="alert"><p>Não foi possível carregar a avaliação de saúde.</p><button type="button" className="mt-2 rounded border px-3 py-2" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></div> : <StableHealthEvidence data={result.data} />}
  </section>;
}
