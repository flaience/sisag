"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck2, Save, XCircle } from "lucide-react";
import { ActionFeedback } from "@/components/ui/ActionFeedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SisagDataState, SisagPage, SisagPageHeader } from "@/components/sisag";
import { WEEKDAYS } from "@/modules/scheduling-config/ServiceBookingAssignment.presentation";

type Person = { id: string; name?: string | null; phone?: string | null; phoneE164?: string | null };
type Period = { id: string; serviceId: string; weekday: number; startTime: string; endTime: string; capacity: number | null };
type Intention = { id: string; periodId: string; clientId: string; attendanceDate: string; status: "registered" | "cancelled"; source: string; createdAt: string };
type Feedback = { type: "success" | "error" | "info"; message: string };
const today = () => new Date().toISOString().slice(0, 10);
const weekday = (value: string) => new Date(value + "T12:00:00.000Z").getUTCDay();

export default function ArrivalIntentionsPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [items, setItems] = useState<Intention[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(today);
  const [clientId, setClientId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const peopleById = useMemo(() => new Map(people.map((item) => [item.id, item])), [people]);
  const periodsById = useMemo(() => new Map(periods.map((item) => [item.id, item])), [periods]);
  const availablePeriods = useMemo(() => periods.filter((item) => item.weekday === weekday(attendanceDate)), [periods, attendanceDate]);

  const loadIntentions = useCallback(async (date: string) => {
    const response = await fetch("/api/v1/scheduling/arrival-intentions?status=registered&attendanceDate=" + encodeURIComponent(date), { cache: "no-store" });
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.ok !== true) throw new Error("intentions");
    setItems(body.items ?? []);
  }, []);

  useEffect(() => { void (async () => {
    try {
      const [peopleResponse, periodsResponse] = await Promise.all([fetch("/api/v1/people", { cache: "no-store" }), fetch("/api/v1/scheduling/arrival-periods?status=active", { cache: "no-store" })]);
      const peopleBody = await peopleResponse.json();
      const periodsBody = await periodsResponse.json();
      if (!peopleResponse.ok || !periodsResponse.ok || peopleBody?.ok !== true || periodsBody?.ok !== true) throw new Error();
      setPeople(peopleBody.items ?? []); setPeriods(periodsBody.items ?? []);
      await loadIntentions(attendanceDate);
    } catch { setFeedback({ type: "error", message: "Não foi possível carregar as intenções de comparecimento." }); }
    finally { setLoading(false); }
  })(); }, [attendanceDate, loadIntentions]);

  useEffect(() => { if (!availablePeriods.some((item) => item.id === periodId)) setPeriodId(availablePeriods[0]?.id ?? ""); }, [availablePeriods, periodId]);

  async function register() {
    if (!clientId || !periodId) { setFeedback({ type: "error", message: "Selecione o cliente e o período." }); return; }
    setSaving(true); setFeedback(null);
    try {
      const response = await fetch("/api/v1/scheduling/arrival-intentions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId, periodId, attendanceDate, requestId: "admin:" + crypto.randomUUID() }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const messages: Record<string, string> = { period_capacity_exhausted: "A capacidade deste período foi atingida.", period_weekday_mismatch: "O período não atende no dia selecionado.", client_not_found: "O cliente selecionado não está mais disponível.", arrival_period_not_found: "O período selecionado não está mais disponível.", arrival_intention_conflict: "Este cliente já possui uma intenção igual." };
        throw new Error(messages[body?.error] ?? "Não foi possível registrar a intenção.");
      }
      setClientId(""); await loadIntentions(attendanceDate);
      setFeedback({ type: "success", message: "Intenção de comparecimento registrada." });
    } catch (error) { setFeedback({ type: "error", message: error instanceof Error ? error.message : "Não foi possível registrar a intenção." }); }
    finally { setSaving(false); }
  }

  async function cancel(id: string) {
    if (confirmCancel !== id) { setConfirmCancel(id); setFeedback({ type: "info", message: "Clique novamente em Cancelar para confirmar." }); return; }
    try {
      const response = await fetch("/api/v1/scheduling/arrival-intentions/" + id, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setConfirmCancel(""); await loadIntentions(attendanceDate);
      setFeedback({ type: "success", message: "Intenção cancelada. O histórico foi preservado." });
    } catch { setFeedback({ type: "error", message: "Não foi possível cancelar a intenção." }); }
  }

  if (loading) return <SisagPage><SisagDataState state="loading" title="Carregando intenções" /></SisagPage>;
  return <SisagPage><SisagPageHeader context={<span className="inline-flex items-center gap-2"><CalendarCheck2 className="h-4 w-4" />Ordem de chegada</span>} title="Intenções de comparecimento" description="Registre quem pretende comparecer em uma data e período, sem reservar horário ou definir posição de atendimento." />
    {feedback ? <ActionFeedback type={feedback.type} message={feedback.message} /> : null}
    <Card className="rounded-2xl border-slate-200"><CardHeader><CardTitle className="text-lg">Nova intenção</CardTitle><CardDescription>O registro respeita o dia e a capacidade do período configurado.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-3"><div><Label>Data</Label><Input className="mt-1" type="date" min={today()} value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} /></div><div><Label>Cliente</Label><select value={clientId} onChange={(event) => setClientId(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Selecione</option>{people.map((item) => <option key={item.id} value={item.id}>{item.name ?? "Cliente sem nome"}{item.phoneE164 || item.phone ? " · " + (item.phoneE164 ?? item.phone) : ""}</option>)}</select></div><div><Label>Período de atendimento</Label><select value={periodId} onChange={(event) => setPeriodId(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Selecione</option>{availablePeriods.map((item) => <option key={item.id} value={item.id}>{WEEKDAYS[item.weekday]} · {item.startTime} às {item.endTime}{item.capacity === null ? "" : " · capacidade " + item.capacity}</option>)}</select>{availablePeriods.length === 0 ? <p className="mt-1 text-xs text-amber-700">Nenhum período ativo atende nesta data.</p> : null}</div><div className="flex justify-end md:col-span-3"><Button onClick={() => void register()} disabled={saving || !clientId || !periodId}><Save className="mr-2 h-4 w-4" />{saving ? "Registrando..." : "Registrar intenção"}</Button></div></CardContent></Card>
    {items.length === 0 ? <SisagDataState state="empty" title="Nenhuma intenção nesta data" description="Os registros antecipados aparecerão aqui." /> : <div className="space-y-3">{items.map((item) => { const person = peopleById.get(item.clientId); const period = periodsById.get(item.periodId); return <Card key={item.id} className="rounded-2xl border-slate-200"><CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"><div><p className="font-semibold text-slate-900">{person?.name ?? "Cliente"}</p><p className="mt-1 text-sm text-slate-600">{period ? WEEKDAYS[period.weekday] + " · " + period.startTime + " às " + period.endTime : "Período configurado"}</p><p className="mt-1 text-xs text-slate-500">Registrada via {item.source} · sem horário reservado</p></div><Button variant={confirmCancel === item.id ? "destructive" : "outline"} size="sm" onClick={() => void cancel(item.id)}><XCircle className="mr-2 h-4 w-4" />{confirmCancel === item.id ? "Confirmar cancelamento" : "Cancelar intenção"}</Button></CardContent></Card>; })}</div>}
  </SisagPage>;
}
