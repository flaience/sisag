"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, ShieldCheck, UserRoundCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SisagDataState, SisagPage, SisagPageHeader } from "@/components/sisag";

type HandoffStatus = "pending" | "claimed" | "resolved" | "dismissed" | "superseded";
type HandoffItem = {
  id: string;
  whatsappAccountId: string;
  correlationId: string;
  reasonCode: string;
  confidenceMilli: number | null;
  status: HandoffStatus;
  claimedByCurrentUser: boolean;
  resolvedByCurrentUser: boolean;
  claimedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const labels: Record<HandoffStatus, string> = { pending: "Aguardando", claimed: "Em atendimento", resolved: "Concluído", dismissed: "Dispensado", superseded: "Substituído" };
const styles: Record<HandoffStatus, string> = { pending: "bg-amber-50 text-amber-700", claimed: "bg-sky-50 text-sky-700", resolved: "bg-emerald-50 text-emerald-700", dismissed: "bg-slate-100 text-slate-600", superseded: "bg-slate-100 text-slate-500" };
const reasonLabel = (reason: string) => ({ provider_unavailable: "Provedor indisponível", invalid_output: "Resposta automática inválida", handoff_required: "Atendimento humano necessário" }[reason] ?? "Revisão humana necessária");

export default function AgentHandoffsPage() {
  const [items, setItems] = useState<HandoffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/settings/agent-shadow/handoffs?status=active&limit=50", { cache: "no-store" });
      if (!response.ok) throw new Error("load_failed");
      const data = await response.json();
      setItems(data.items ?? []);
      setError(null);
    } catch {
      setError("Não foi possível carregar os atendimentos encaminhados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function act(item: HandoffItem, action: "claim" | "resolve" | "dismiss") {
    const question = action === "claim" ? "Assumir este atendimento?" : action === "resolve" ? "Concluir este atendimento e liberar o agente?" : "Dispensar esta pendência e liberar o agente?";
    if (!window.confirm(question)) return;
    setBusyId(item.id);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/v1/settings/agent-shadow/handoffs", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, action }) });
      if (!response.ok) throw new Error("conflict");
      setSuccess(action === "claim" ? "Atendimento assumido. O agente permanece pausado." : "Pendência encerrada. O agente poderá voltar a atender esta conversa.");
      await load();
    } catch {
      setError("A situação mudou ou a ação não é permitida. Atualize a fila e tente novamente.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <SisagPage>
      <SisagPageHeader context={<span className="inline-flex items-center gap-2"><UserRoundCheck className="h-4 w-4" />Agente WhatsApp</span>} title="Atendimentos humanos" description="Assuma e conclua conversas encaminhadas pelo agente. A fila exibe somente metadados operacionais sanitizados." />
      <Card className="rounded-2xl border-sky-200 bg-sky-50/40"><CardContent className="flex gap-3 p-4 text-sm text-sky-900"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><p>Enquanto uma pendência estiver aguardando ou em atendimento, o agente automático permanece pausado para essa conversa.</p></CardContent></Card>
      <div className="flex justify-end"><Button variant="outline" disabled={loading || busyId !== null} onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Atualizar fila</Button></div>
      {error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
      {success ? <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p> : null}
      {loading ? <SisagDataState state="loading" title="Carregando atendimentos" /> : items.length ? <div className="space-y-3">{items.map(item => (
        <Card key={item.id} className="rounded-2xl"><CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-slate-500">Recebido em {new Date(item.createdAt).toLocaleString("pt-BR")}</p><h2 className="mt-1 font-semibold text-slate-900">{reasonLabel(item.reasonCode)}</h2><p className="mt-1 text-xs text-slate-500">Correlação: {item.correlationId}</p></div><span className={"rounded-full px-3 py-1 text-xs font-semibold " + styles[item.status]}>{labels[item.status]}</span></div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {item.status === "pending" ? <><Button disabled={busyId !== null} onClick={() => void act(item, "claim")}><UserRoundCheck className="mr-2 h-4 w-4" />Assumir</Button><Button variant="outline" disabled={busyId !== null} onClick={() => void act(item, "dismiss")}><XCircle className="mr-2 h-4 w-4" />Dispensar</Button></> : null}
            {item.status === "claimed" && item.claimedByCurrentUser ? <><Button disabled={busyId !== null} onClick={() => void act(item, "resolve")}><CheckCircle2 className="mr-2 h-4 w-4" />Concluir</Button><Button variant="outline" disabled={busyId !== null} onClick={() => void act(item, "dismiss")}><XCircle className="mr-2 h-4 w-4" />Dispensar</Button></> : null}
            {item.status === "claimed" && !item.claimedByCurrentUser ? <p className="text-sm text-slate-500">Atendimento assumido por outro operador.</p> : null}
          </div>
        </CardContent></Card>
      ))}</div> : <SisagDataState state="empty" title="Nenhum atendimento aguardando" description="Novas conversas encaminhadas pelo agente aparecerão aqui." />}
    </SisagPage>
  );
}