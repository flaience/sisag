"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SisagDataState, SisagPage, SisagPageHeader } from "@/components/sisag";

type Data = {
  summary: { acceptanceRate: number; agreementRate: number; averageConfidence: number; averageReviewMinutes: number; pending: number; reviewed: number; accepted: number; adjusted: number; rejected: number };
  agent: { executions: number; aiRuns: number; fallbackRuns: number; aiRate: number; fallbackRate: number; agentDeterministicAgreementRate: number; agentHumanAgreementRate: number; humanComparisons: number; inputTokens: number; outputTokens: number; totalTokens: number; averageDurationMs: number; p95DurationMs: number };
  providers: Array<{ provider: string; model: string; total: number; aiRuns: number; fallbackRuns: number; averageDurationMs: number; totalTokens: number }>;
  errors: Array<{ errorCode: string; count: number }>;
};

export default function Page() {
  const [data, setData] = useState<Data | null>(null), [days, setDays] = useState(30), [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); const response = await fetch("/api/v1/settings/booking-followups/recovery/agent-outcomes?days=" + days, { cache: "no-store" }); setData(response.ok ? await response.json() : null); setLoading(false); }, [days]);
  useEffect(() => { void load(); }, [load]);
  return <SisagPage>
    <SisagPageHeader context={<span className="inline-flex items-center gap-2"><BrainCircuit className="h-4 w-4" />Inteligência assistida</span>} title="Qualidade do agente em sombra" description="Compare agente, regras e decisões humanas antes de ampliar qualquer autonomia." />
    <div className="flex flex-wrap justify-between gap-2"><Button asChild variant="ghost" size="sm"><Link href="/admin/settings/booking-followups/recovery"><ArrowLeft className="mr-2 h-4 w-4" />Voltar aos casos</Link></Button><div className="flex gap-2">{[7, 30, 90].map(value => <Button key={value} size="sm" variant={days === value ? "default" : "outline"} onClick={() => setDays(value)}>{value} dias</Button>)}</div></div>
    {loading ? <SisagDataState state="loading" title="Calculando qualidade" /> : data ? <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Execuções por IA" value={`${data.agent.aiRate}%`} detail={`${data.agent.aiRuns}/${data.agent.executions}`} /><Metric label="Fallback seguro" value={`${data.agent.fallbackRate}%`} detail={`${data.agent.fallbackRuns}/${data.agent.executions}`} /><Metric label="Agente × humano" value={`${data.agent.agentHumanAgreementRate}%`} detail={`${data.agent.humanComparisons} comparações`} /><Metric label="Agente × regras" value={`${data.agent.agentDeterministicAgreementRate}%`} /></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Tokens consumidos" value={data.agent.totalTokens.toLocaleString("pt-BR")} detail={`${data.agent.inputTokens} entrada · ${data.agent.outputTokens} saída`} /><Metric label="Duração média" value={`${data.agent.averageDurationMs} ms`} /><Metric label="Duração p95" value={`${data.agent.p95DurationMs} ms`} /><Metric label="Aceitação humana" value={`${data.summary.acceptanceRate}%`} detail={`Regras × humano: ${data.summary.agreementRate}%`} /></div>
      <Card className="rounded-2xl"><CardHeader><CardTitle className="text-lg">Provedores e modelos</CardTitle></CardHeader><CardContent>{data.providers.length ? data.providers.map(item => <div key={`${item.provider}:${item.model}`} className="mb-2 rounded-xl bg-slate-50 p-3 text-sm"><b>{item.provider} · {item.model}</b><p className="mt-1 text-slate-600">{item.total} execuções · {item.aiRuns} IA · {item.fallbackRuns} fallback · {item.totalTokens} tokens · média {item.averageDurationMs} ms</p></div>) : <p className="text-sm text-slate-500">Nenhuma execução registrada no período.</p>}</CardContent></Card>
      <Card className="rounded-2xl"><CardHeader><CardTitle className="text-lg">Falhas normalizadas</CardTitle></CardHeader><CardContent>{data.errors.length ? <div className="grid gap-2 sm:grid-cols-2">{data.errors.map(item => <div key={item.errorCode} className="rounded-xl bg-amber-50 p-3 text-sm"><b>{item.errorCode}</b> · {item.count}</div>)}</div> : <p className="text-sm text-emerald-700">Nenhuma falha registrada no período.</p>}</CardContent></Card>
    </> : <SisagDataState state="empty" title="Sem dados de recomendações" />}
  </SisagPage>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) { return <div className="rounded-xl border bg-white p-4"><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-slate-500">{label}</p>{detail ? <p className="mt-1 text-xs text-slate-400">{detail}</p> : null}</div>; }
