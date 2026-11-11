"use client";
import { useState } from "react";
import { FlaskConical, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveWhatsAppHomologationPendingProposal, type WhatsAppHomologationProposalKind } from "@/modules/whatsapp/homologation/WhatsAppHomologationPendingProposal";

type ConversationMessage = { role: "user" | "assistant"; text: string };
type Result = { ok: boolean; error?: string; correlationId?: string; decision?: { action: string; toolName: string | null; reasonCode: string; confidence: number; clarificationQuestion?: string | null }; execution?: { provider: string; model: string | null; durationMs: number }; toolObservation?: { status: string; errorCode: string | null }; answerCandidate?: { text: string } | null; bookingConfirmationProposal?: { text: string } | null; bookingCancellationProposal?: { text: string } | null; bookingReschedulingProposal?: { text: string } | null };

export default function WhatsAppHomologationPage() {
  const [phone, setPhone] = useState("+55");
  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<ConversationMessage[]>([]);

  async function run() {
    if (!/^\+[1-9]\d{7,14}$/.test(phone) || !text.trim()) return;
    const proposalKind: WhatsAppHomologationProposalKind | null = result?.bookingConfirmationProposal ? "booking_confirmation" : result?.bookingCancellationProposal ? "booking_cancellation" : result?.bookingReschedulingProposal ? "booking_rescheduling" : null;
    const preview = resolveWhatsAppHomologationPendingProposal({ text, proposalKind });
    if (preview) {
      setHistory((current): ConversationMessage[] => [...current, { role: "user" as const, text: text.trim() }, { role: "assistant" as const, text: preview.text }].slice(-6));
      setResult(null); setText(""); setError(null); return;
    }
    setRunning(true); setError(null); setResult(null);
    try {
      const priorUserText = [...history].reverse().find((item) => item.role === "user")?.text;
      const priorAssistantText = [...history].reverse().find((item) => item.role === "assistant")?.text;
      const context = priorUserText && priorAssistantText ? { priorUserText, priorAssistantText } : undefined;
      const response = await fetch("/api/v1/settings/whatsapp/homologation", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ senderPhoneE164: phone, text: text.trim(), context }) });
      const body = await response.json().catch(() => null) as Result | null;
      if (!response.ok || !body) throw new Error(body?.error ?? "request");
      setResult(body);
      const presented = body.bookingConfirmationProposal?.text ?? body.bookingCancellationProposal?.text ?? body.bookingReschedulingProposal?.text ?? body.answerCandidate?.text ?? body.decision?.clarificationQuestion ?? null;
      if (body.ok && presented) { setHistory((current): ConversationMessage[] => [...current, { role: "user" as const, text: text.trim() }, { role: "assistant" as const, text: presented }].slice(-6)); setText(""); }
    } catch { setError("Não foi possível executar a homologação agora. Verifique a configuração do agente n8n."); }
    finally { setRunning(false); }
  }

  const responseText = result?.bookingConfirmationProposal?.text ?? result?.bookingCancellationProposal?.text ?? result?.bookingReschedulingProposal?.text ?? result?.answerCandidate?.text ?? result?.decision?.clarificationQuestion ?? null;
  const hasProposal = Boolean(result?.bookingConfirmationProposal || result?.bookingCancellationProposal || result?.bookingReschedulingProposal);
  return <div className="space-y-6">
    <div><div className="flex items-center gap-2 text-sm font-medium text-slate-500"><FlaskConical className="h-4 w-4" />WhatsApp</div><h1 className="mt-2 text-2xl font-semibold text-slate-950">Homologação do agente</h1><p className="mt-2 text-sm text-slate-600">Simule uma mensagem de texto e confira como o agente decidiria responder.</p></div>
    <div className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"><ShieldCheck className="h-5 w-5 shrink-0" /><div><strong>Ambiente seguro de teste.</strong><p className="mt-1">Nenhuma resposta será enviada ao WhatsApp e nenhuma proposta será executada.</p></div></div>
    {history.length ? <Card className="rounded-2xl"><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle>Conversa simulada</CardTitle><Button variant="outline" size="sm" onClick={() => { setHistory([]); setResult(null); }}>Limpar conversa</Button></div><CardDescription>Histórico mantido somente nesta tela até ela ser recarregada.</CardDescription></CardHeader><CardContent className="space-y-3">{history.map((item, index) => <div key={index} className={item.role === "user" ? "ml-8 rounded-xl bg-blue-50 p-3 text-sm text-blue-950" : "mr-8 rounded-xl bg-slate-100 p-3 text-sm text-slate-900"}><strong>{item.role === "user" ? "Cliente" : "Agente"}</strong><p className="mt-1 whitespace-pre-wrap">{item.text}</p></div>)}</CardContent></Card> : null}
    <Card className="rounded-2xl"><CardHeader><CardTitle>Mensagem simulada</CardTitle><CardDescription>Use um telefone fictício ou autorizado para teste. Nenhuma conta da Meta é necessária.</CardDescription></CardHeader><CardContent className="space-y-4">
        <div><Label>Telefone simulado do cliente</Label><Input className="mt-1" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+5554999999999" /></div>
      <div><Label>Mensagem</Label><textarea className="mt-1 min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" maxLength={4096} value={text} onChange={(event) => setText(event.target.value)} placeholder="Ex.: Quais são meus próximos agendamentos?" /></div>
      <div className="flex justify-end"><Button onClick={() => void run()} disabled={running || !/^\+[1-9]\d{7,14}$/.test(phone) || !text.trim()}>{running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-2 h-4 w-4" />}{running ? "Executando..." : "Executar homologação"}</Button></div>
    </CardContent></Card>
    {error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{error}</div> : null}
    {result?.ok && result.decision ? <Card className="rounded-2xl"><CardHeader><CardTitle>Resultado</CardTitle><CardDescription>Correlação: {result.correlationId}</CardDescription></CardHeader><CardContent className="space-y-4 text-sm">
      <div className="grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><span className="text-slate-500">Decisão</span><p className="mt-1 font-medium">{result.decision.action}</p></div><div className="rounded-xl bg-slate-50 p-4"><span className="text-slate-500">Ferramenta</span><p className="mt-1 font-medium">{result.decision.toolName ?? "Nenhuma"}</p></div><div className="rounded-xl bg-slate-50 p-4"><span className="text-slate-500">Motivo</span><p className="mt-1 font-medium">{result.decision.reasonCode}</p></div></div>
      {responseText ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><span className="text-emerald-800">{hasProposal ? "Proposta que seria apresentada" : result.decision.action === "clarify" ? "Pergunta que seria apresentada" : "Resposta que seria apresentada"}</span><p className="mt-2 whitespace-pre-wrap font-medium text-emerald-950">{responseText}</p></div> : <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">A decisão não produziu uma resposta candidata.</div>}
      <p className="text-xs text-slate-500">Execução: {result.execution?.provider ?? "—"} / {result.execution?.model ?? "—"} · {result.execution?.durationMs ?? 0} ms · ferramenta {result.toolObservation?.status ?? "—"}</p>
    </CardContent></Card> : null}
  </div>;
}
