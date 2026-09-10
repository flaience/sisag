"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SisagDataState, SisagPage, SisagPageHeader } from "@/components/sisag";

type Plan = { id: string; scope: string; status: string; rolloutPercent: number };
type Decision = { planId: string; status: "eligible_for_graduation" | "hold"; reasons: string[] };
type Graduation = { policyVersion: string; healthPolicyVersion: string; requiresHumanApproval: true; automaticGraduation: false; period: { days: number; from: string; to: string }; plans: Decision[] };
type Proposal = { id: string; releasePlanId: string; releaseCandidateId: string; scope: string; status: "proposed" | "approved" | "rejected"; rolloutPercent: number; healthPolicyVersion: string; graduationPolicyVersion: string; evidence: { decision?: string; reasons?: string[]; observedDays?: number; observedFrom?: string; observedTo?: string }; reason: string; createdAt: string };
const endpoint = "/api/v1/settings/booking-followups/recovery/agent-outcomes/release-graduation-proposals";

export default function Page() {
  const [plans, setPlans] = useState<Plan[]>([]), [graduation, setGraduation] = useState<Graduation | null>(null), [items, setItems] = useState<Proposal[]>([]);
  const [planId, setPlanId] = useState(""), [reason, setReason] = useState(""), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [planResponse, graduationResponse, proposalResponse] = await Promise.all([
        fetch("/api/v1/settings/booking-followups/recovery/agent-outcomes/release-plans", { cache: "no-store" }),
        fetch("/api/v1/settings/booking-followups/recovery/agent-outcomes/release-graduation?days=30", { cache: "no-store" }),
        fetch(endpoint, { cache: "no-store" }),
      ]);
      if (!planResponse.ok || !graduationResponse.ok || !proposalResponse.ok) throw new Error();
      setPlans((await planResponse.json()).items ?? []); setGraduation(await graduationResponse.json()); setItems((await proposalResponse.json()).items ?? []);
    } catch { setError("Não foi possível carregar a graduação do retrieval."); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const eligible = useMemo(() => {
    const ids = new Set((graduation?.plans ?? []).filter(item => item.status === "eligible_for_graduation").map(item => item.planId));
    const pending = new Set(items.filter(item => item.status === "proposed").map(item => item.releasePlanId));
    return plans.filter(item => item.status === "scheduled" && item.rolloutPercent === 100 && ids.has(item.id) && !pending.has(item.id));
  }, [plans, graduation, items]);
  async function submit() {
    if (!planId || reason.trim().length < 3) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ planId, reason: reason.trim() }) });
      const data = await response.json();
      if (!response.ok || !data.ok) { const messages: Record<string, string> = { full_release_plan_not_found: "O plano integral não está mais disponível.", release_graduation_evidence_not_found: "A evidência de graduação não foi encontrada.", release_not_eligible_for_graduation: "A evidência atual não permite graduação.", release_graduation_proposal_exists: "Já existe uma proposta pendente para este plano." }; setError(messages[data.error] ?? "Não foi possível registrar a proposta."); return; }
      setPlanId(""); setReason(""); await load();
    } catch { setError("Não foi possível registrar a proposta."); } finally { setBusy(false); }
  }
  return <SisagPage><SisagPageHeader context={<span className="inline-flex items-center gap-2"><GraduationCap className="h-4 w-4" />Graduação governada</span>} title="Propostas de graduação do retrieval" description="Revise a elegibilidade e registre uma proposta com evidência congelada." /><Button asChild variant="ghost" size="sm"><Link href="/admin/settings/booking-followups/recovery/agent-outcomes"><ArrowLeft className="mr-2 h-4 w-4" />Voltar à observabilidade</Link></Button>{loading ? <SisagDataState state="loading" title="Carregando elegibilidade" /> : <><Card className="rounded-2xl"><CardHeader><CardTitle className="text-lg">Nova proposta</CardTitle></CardHeader><CardContent className="grid gap-3"><label className="grid gap-1 text-sm"><span>Plano elegível em rollout integral</span><select className="rounded-xl border p-3" value={planId} onChange={event => setPlanId(event.target.value)}><option value="">Selecione</option>{eligible.map(item => <option key={item.id} value={item.id}>{item.scope} · 100% · {item.id.slice(0, 8)}</option>)}</select></label><textarea className="min-h-24 rounded-xl border p-3 text-sm" maxLength={500} placeholder="Justificativa para revisão da graduação" value={reason} onChange={event => setReason(event.target.value)} /><Button disabled={!planId || reason.trim().length < 3 || busy} onClick={() => void submit()}>{busy ? "Registrando..." : "Criar proposta governada"}</Button>{error ? <p className="text-sm text-rose-700">{error}</p> : null}<p className="text-xs text-amber-700">A proposta não torna o retrieval estável. Aprovação humana continua obrigatória.</p></CardContent></Card><Card className="rounded-2xl"><CardHeader><CardTitle className="text-lg">Elegibilidade atual</CardTitle></CardHeader><CardContent>{graduation?.plans.length ? graduation.plans.map(item => <div key={item.planId} className="mb-3 rounded-xl border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><b>{item.planId}</b><span className={item.status === "eligible_for_graduation" ? "rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800" : "rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800"}>{item.status === "eligible_for_graduation" ? "Elegível para proposta" : "Manter release atual"}</span></div>{item.reasons.length ? <p className="mt-2 text-xs text-amber-700">{item.reasons.join(" · ")}</p> : <p className="mt-2 text-xs text-emerald-700">Todos os critérios de saúde, rollout e janela foram atendidos.</p>}</div>) : <SisagDataState state="empty" title="Nenhuma avaliação disponível" />}<p className="text-xs text-slate-500">Políticas: {graduation?.healthPolicyVersion ?? "—"} · {graduation?.policyVersion ?? "—"} · janela de {graduation?.period.days ?? 30} dias</p></CardContent></Card><Card className="rounded-2xl"><CardHeader><CardTitle className="text-lg">Propostas e evidências congeladas</CardTitle></CardHeader><CardContent>{items.length ? items.map(item => <div key={item.id} className="mb-3 rounded-xl border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><b>{item.scope} · rollout {item.rolloutPercent}%</b><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{item.status}</span></div><p className="mt-2 text-sm text-slate-600">{item.reason}</p><div className="mt-3 grid gap-1 text-xs text-slate-500"><span>Candidato: {item.releaseCandidateId}</span><span>Decisão congelada: {item.evidence?.decision ?? "indisponível"}</span><span>Janela observada: {item.evidence?.observedDays ?? "—"} dias · {item.evidence?.observedFrom ?? "—"} até {item.evidence?.observedTo ?? "—"}</span><span>Políticas: {item.healthPolicyVersion} · {item.graduationPolicyVersion}</span><span>Criada em {new Date(item.createdAt).toLocaleString("pt-BR")}</span></div>{item.evidence?.reasons?.length ? <p className="mt-2 text-xs text-amber-700">Sinais: {item.evidence.reasons.join(" · ")}</p> : null}</div>) : <SisagDataState state="empty" title="Nenhuma proposta de graduação registrada" />}</CardContent></Card></>}<p className="text-xs text-slate-500">Esta interface apenas registra propostas. Não revisa, aplica ou promove releases automaticamente.</p></SisagPage>;
}
