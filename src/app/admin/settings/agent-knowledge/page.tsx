"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpenCheck, CheckCircle2, Plus, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SisagDataState, SisagPage, SisagPageHeader } from "@/components/sisag";

type KnowledgeItem = {
  id: string;
  sourceType: string;
  sourceRef: string;
  title: string;
  content: string;
  contentHash: string;
  version: number;
  status: "draft" | "approved" | "retired";
  validFrom: string;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
};

const statusLabels = { draft: "Rascunho", approved: "Aprovado", retired: "Retirado" };
const statusStyles = {
  draft: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  retired: "bg-slate-100 text-slate-600",
};

const emptyForm = { sourceType: "policy", sourceRef: "", title: "", content: "", validUntil: "" };

export default function AgentKnowledgePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/settings/agent-knowledge", { cache: "no-store" });
      if (!response.ok) throw new Error("load_failed");
      const data = await response.json();
      setItems(data.items ?? []);
      setError(null);
    } catch {
      setError("Não foi possível carregar a base de conhecimento.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createDraft() {
    setBusyId("create");
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/v1/settings/agent-knowledge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : null,
        }),
      });
      if (!response.ok) throw new Error("create_failed");
      setForm(emptyForm);
      setSuccess("Rascunho criado. Revise-o antes de aprovar.");
      await load();
    } catch {
      setError("Revise os campos. O conteúdo deve ter entre 1 e 8.000 caracteres.");
    } finally {
      setBusyId(null);
    }
  }

  async function transition(item: KnowledgeItem, action: "approve" | "retire") {
    const verb = action === "approve" ? "aprovar" : "retirar";
    if (!window.confirm("Deseja " + verb + " “" + item.title + "” (versão " + item.version + ")?")) return;
    setBusyId(item.id);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/v1/settings/agent-knowledge/" + item.id + "/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error("transition_failed");
      setSuccess(action === "approve" ? "Documento aprovado para consulta pelo agente." : "Documento retirado da consulta do agente.");
      await load();
    } catch {
      setError("A situação do documento mudou. Atualize a lista e tente novamente.");
    } finally {
      setBusyId(null);
    }
  }

  const canCreate = form.sourceRef.trim().length >= 2 && form.title.trim().length >= 3 && form.content.trim().length > 0;

  return (
    <SisagPage>
      <SisagPageHeader
        context={<span className="inline-flex items-center gap-2"><BookOpenCheck className="h-4 w-4" />Agente WhatsApp</span>}
        title="Conhecimento do agente"
        description="Cadastre referências gerais usadas pelo agente. Todo conteúdo nasce como rascunho e só entra em consulta após aprovação explícita."
      />

      <Card className="rounded-2xl border-emerald-200 bg-emerald-50/40">
        <CardContent className="flex gap-3 p-4 text-sm text-emerald-900">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <p>Somente documentos aprovados, válidos e pertencentes à empresa podem ser recuperados pelo agente. Criar um rascunho não o publica.</p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-lg">Novo rascunho</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Input aria-label="Tipo da origem" value={form.sourceType} maxLength={40} onChange={(event) => setForm({ ...form, sourceType: event.target.value })} placeholder="Tipo: policy" />
          <Input aria-label="Referência da origem" value={form.sourceRef} maxLength={160} onChange={(event) => setForm({ ...form, sourceRef: event.target.value })} placeholder="Referência única, ex.: politica-cancelamento" />
          <Input aria-label="Título" className="md:col-span-2" value={form.title} maxLength={200} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Título reconhecível" />
          <Textarea aria-label="Conteúdo" className="min-h-44 md:col-span-2" value={form.content} maxLength={8000} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="Conteúdo factual, revisado e adequado para respostas pelo WhatsApp" />
          <label className="text-sm text-slate-600">Válido até (opcional)<Input type="datetime-local" value={form.validUntil} onChange={(event) => setForm({ ...form, validUntil: event.target.value })} /></label>
          <div className="flex items-end justify-end"><Button disabled={busyId !== null || !canCreate} onClick={() => void createDraft()}><Plus className="mr-2 h-4 w-4" />Criar rascunho</Button></div>
        </CardContent>
      </Card>

      {error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
      {success ? <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p> : null}

      {loading ? <SisagDataState state="loading" title="Carregando conhecimento" /> : items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="rounded-2xl">
              <CardContent className="p-5">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">{item.sourceType} · {item.sourceRef} · versão {item.version}</p>
                    <h2 className="mt-1 font-semibold text-slate-900">{item.title}</h2>
                  </div>
                  <span className={"h-fit rounded-full px-3 py-1 text-xs font-semibold " + statusStyles[item.status]}>{statusLabels[item.status]}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.content}</p>
                <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <p className="break-all">SHA-256: {item.contentHash}</p>
                  <p>Válido de {new Date(item.validFrom).toLocaleString("pt-BR")} até {item.validUntil ? new Date(item.validUntil).toLocaleString("pt-BR") : "sem término"}</p>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  {item.status === "draft" ? <Button disabled={busyId !== null} onClick={() => void transition(item, "approve")}><CheckCircle2 className="mr-2 h-4 w-4" />Aprovar</Button> : null}
                  {item.status === "approved" ? <Button variant="outline" disabled={busyId !== null} onClick={() => void transition(item, "retire")}><XCircle className="mr-2 h-4 w-4" />Retirar</Button> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : <SisagDataState state="empty" title="Nenhum documento cadastrado" description="Crie o primeiro rascunho para iniciar a base geral do agente." />}
    </SisagPage>
  );
}
