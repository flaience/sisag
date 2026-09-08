"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SisagDataState, SisagPage, SisagPageHeader } from "@/components/sisag";

type Plan = { id: string; scope: string; status: string; rolloutPercent: number };
type Decision = { planId: string; status: "eligible_for_expansion" | "hold" };
type Proposal = {
  id: string; releasePlanId: string; scope: string;
  status: "proposed" | "approved" | "rejected" | "applied";
  currentRolloutPercent: number; proposedRolloutPercent: number;
  healthPolicyVersion: string; progressionPolicyVersion: string;
  evidence: { decision?: string; observedDays?: number }; reason: string; createdAt: string;
  reviewedAt: string | null; reviewReason: string | null;
  appliedAt: string | null; applicationReason: string | null;
};

const endpoint = "/api/v1/settings/booking-followups/recovery/agent-outcomes/release-progression-proposals";

export default function Page() {
  const [plans, setPlans] = useState<Plan[]>([]), [decisions, setDecisions] = useState<Decision[]>([]), [items, setItems] = useState<Proposal[]>([]);
  const [planId, setPlanId] = useState(""), [proposed, setProposed] = useState(10), [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    const [planResponse, outcomeResponse, proposalResponse] = await Promise.all([
      fetch("/api/v1/settings/booking-followups/recovery/agent-outcomes/release-plans", { cache: "no-store" }),
      fetch("/api/v1/settings/booking-followups/recovery/agent-outcomes?days=30", { cache: "no-store" }),
      fetch(endpoint, { cache: "no-store" }),
    ]);
    setPlans(planResponse.ok ? (await planResponse.json()).items ?? [] : []);
    setDecisions(outcomeResponse.ok ? (await outcomeResponse.json()).retrieval?.releaseCanaries?.progression?.plans ?? [] : []);
    setItems(proposalResponse.ok ? (await proposalResponse.json()).items ?? [] : []);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const eligible = useMemo(() => {
    const ids = new Set(decisions.filter(x => x.status === "eligible_for_expansion").map(x => x.planId));
    const pending = new Set(items.filter(x => x.status === "proposed").map(x => x.releasePlanId));
    return plans.filter(x => x.status === "scheduled" && ids.has(x.id) && !pending.has(x.id));
  }, [plans, decisions, items]);
  const selected = eligible.find(x => x.id === planId), maximum = selected ? Math.min(selected.rolloutPercent + 25, 100) : 100;
  function select(id: string) { setPlanId(id); const plan = eligible.find(x => x.id === id); if (plan) setProposed(Math.min(plan.rolloutPercent + 5, 100)); }
  async function submit() {
    if (!selected || reason.trim().length < 3 || proposed <= selected.rolloutPercent || proposed > maximum) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ planId: selected.id, proposedRolloutPercent: proposed, reason: reason.trim() }) });
      const data = await response.json();
      if (!response.ok || !data.ok) { setError(data.error === "release_not_eligible_for_expansion" ? "A evidência atual não permite progressão." : data.error === "release_progression_proposal_exists" ? "Já existe uma proposta pendente para este plano." : data.error === "invalid_rollout_progression" ? "O aumento deve ser gradual e limitado a 25 pontos percentuais." : "Não foi possível registrar a proposta."); return; }
      setPlanId(""); setReason(""); await load();
    } catch { setError("Não foi possível registrar a proposta."); } finally { setBusy(false); }
  }
  async function review(item: Proposal, decision: "approved" | "rejected") {
    const note = window.prompt(decision === "approved" ? "Justificativa para aprovar a proposta de expansão:" : "Justificativa para rejeitar a proposta de expansão:");
    if (note === null) return;
    if (note.trim().length < 3) { setError("Informe uma justificativa com pelo menos 3 caracteres."); return; }
    setBusy(true); setError(null);
    try {
      const response = await fetch(endpoint, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, decision, reason: note.trim() }) });
      const data = await response.json();
      if (!response.ok || !data.ok) { setError("A proposta já foi revisada ou não está disponível."); return; }
      await load();
    } catch { setError("Não foi possível registrar a revisão."); } finally { setBusy(false); }
  }
  async function apply(item: Proposal) {
    if (!window.confirm(`Aplicar progressão de ${item.currentRolloutPercent}% para ${item.proposedRolloutPercent}%?`)) return;
    const note = window.prompt("Justificativa para aplicar a progressão aprovada:");
    if (note === null) return;
    if (note.trim().length < 3) { setError("Informe uma justificativa com pelo menos 3 caracteres."); return; }
    setBusy(true); setError(null);
    try {
      const response = await fetch(endpoint, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, reason: note.trim() }) });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        const messages: Record<string, string> = {
          release_progression_health_changed: "A saúde do canário mudou; reavalie antes de aplicar.",
          release_progression_policy_changed: "A política de progressão mudou; crie uma nova proposta.",
          release_plan_changed: "O plano mudou desde a aprovação; a aplicação foi bloqueada.",
          concurrent_release_progression: "Outra progressão foi aplicada simultaneamente; atualize o histórico.",
        };
        setError(messages[data.error] ?? "Não foi possível aplicar a progressão aprovada."); return;
      }
      await load();
    } catch { setError("Não foi possível aplicar a progressão aprovada."); } finally { setBusy(false); }
  }
  return <SisagPage><SisagPageHeader context={<span className="inline-flex items-center gap-2"><TrendingUp className="h-4 w-4" />Progressão governada</span>} title="Propostas de expansão do retrieval" description="Prepare, revise e aplique expansões graduais com evidência revalidada." /><Button asChild variant="ghost" size="sm"><Link href="/admin/settings/booking-followups/recovery/agent-outcomes"><ArrowLeft className="mr-2 h-4 w-4" />Voltar à observabilidade</Link></Button><Card className="rounded-2xl"><CardHeader><CardTitle className="text-lg">Nova proposta</CardTitle></CardHeader><CardContent className="grid gap-3"><label className="grid gap-1 text-sm"><span>Plano elegível</span><select className="rounded-xl border p-3" value={planId} onChange={e => select(e.target.value)}><option value="">Selecione</option>{eligible.map(x => <option key={x.id} value={x.id}>{x.scope} · rollout atual {x.rolloutPercent}% · {x.id.slice(0, 8)}</option>)}</select></label><label className="grid gap-1 text-sm"><span>Novo rollout (%)</span><input className="rounded-xl border p-3" type="number" min={selected ? selected.rolloutPercent + 1 : 2} max={maximum} value={proposed} onChange={e => setProposed(Number(e.target.value))} /></label><textarea className="min-h-24 rounded-xl border p-3 text-sm" maxLength={500} placeholder="Justificativa para revisão da expansão" value={reason} onChange={e => setReason(e.target.value)} /><Button disabled={!selected || reason.trim().length < 3 || proposed <= selected.rolloutPercent || proposed > maximum || busy} onClick={() => void submit()}>{busy ? "Registrando..." : "Criar proposta governada"}</Button>{error ? <p className="text-sm text-rose-700">{error}</p> : null}<p className="text-xs text-amber-700">A proposta congela a evidência, mas não modifica o plano nem aumenta o rollout.</p></CardContent></Card>{loading ? <SisagDataState state="loading" title="Carregando propostas" /> : <Card className="rounded-2xl"><CardHeader><CardTitle className="text-lg">Histórico, revisão e aplicação</CardTitle></CardHeader><CardContent>{items.length ? items.map(item => <div key={item.id} className="mb-3 rounded-xl border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><b>{item.scope} · {item.currentRolloutPercent}% → {item.proposedRolloutPercent}%</b><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{item.status}</span></div><p className="mt-2 text-sm text-slate-600">{item.reason}</p><p className="mt-2 text-xs text-slate-500">Evidência: {item.evidence?.decision ?? "indisponível"} · janela {item.evidence?.observedDays ?? 30} dias</p><p className="mt-1 text-xs text-slate-400">{item.healthPolicyVersion} · {item.progressionPolicyVersion} · {new Date(item.createdAt).toLocaleString("pt-BR")}</p>{item.status === "proposed" ? <div className="mt-3 flex gap-2"><Button size="sm" disabled={busy} onClick={() => void review(item, "approved")}>Aprovar proposta</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void review(item, "rejected")}>Rejeitar proposta</Button></div> : item.status === "approved" ? <div className="mt-3"><Button size="sm" disabled={busy} onClick={() => void apply(item)}>Aplicar progressão aprovada</Button><p className="mt-2 text-xs text-amber-700">Saúde, políticas e estado do plano serão revalidados antes da aplicação.</p></div> : <p className="mt-2 text-xs text-slate-500">{item.status === "applied" ? "Aplicação" : "Decisão"}: {item.status} · {item.applicationReason ?? item.reviewReason}{item.appliedAt || item.reviewedAt ? ` · ${new Date(item.appliedAt ?? item.reviewedAt!).toLocaleString("pt-BR")}` : ""}</p>}</div>) : <SisagDataState state="empty" title="Nenhuma proposta de expansão registrada" />}</CardContent></Card>}<p className="text-xs text-slate-500">Aplicação exige confirmação, justificativa e revalidação; nenhuma progressão é automática.</p></SisagPage>;
}
