"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ListOrdered, Pencil, Power, Save, X } from "lucide-react";
import { ActionFeedback } from "@/components/ui/ActionFeedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SisagDataState, SisagPage, SisagPageHeader } from "@/components/sisag";
import { WEEKDAYS } from "@/modules/scheduling-config/ServiceBookingAssignment.presentation";

type Unit = { id: string; name: string; active: boolean; isDefault?: boolean };
type Service = { id: string; name: string; attendanceMode: "scheduled_time" | "arrival_order"; active: boolean };
type Period = { id: string; unitId: string; serviceId: string; weekday: number; startTime: string; endTime: string; capacity: number | null; active: boolean };
type Feedback = { type: "success" | "error" | "info"; message: string };
type Form = { unitId: string; serviceId: string; weekday: number; startTime: string; endTime: string; capacity: string };
const initial: Form = { unitId: "", serviceId: "", weekday: 1, startTime: "08:00", endTime: "12:00", capacity: "" };

export default function ArrivalPeriodsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [form, setForm] = useState<Form>(initial);
  const [editingId, setEditingId] = useState("");
  const [confirmDeactivate, setConfirmDeactivate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const unitsById = useMemo(() => new Map(units.map((item) => [item.id, item.name])), [units]);
  const servicesById = useMemo(() => new Map(services.map((item) => [item.id, item.name])), [services]);

  async function loadPeriods() {
    const response = await fetch("/api/v1/scheduling/arrival-periods?status=active", { cache: "no-store" });
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.ok !== true) throw new Error("periods");
    setPeriods(body.items ?? []);
  }

  useEffect(() => { void (async () => {
    try {
      const [unitsResponse, servicesResponse] = await Promise.all([fetch("/api/v1/me/company/units", { cache: "no-store" }), fetch("/api/v1/services?status=active", { cache: "no-store" })]);
      const unitBody = await unitsResponse.json();
      const serviceBody = await servicesResponse.json();
      if (unitBody?.ok !== true || serviceBody?.ok !== true) throw new Error("references");
      const activeUnits = (unitBody.items ?? []).filter((item: Unit) => item.active);
      const arrivalServices = (serviceBody.items ?? []).filter((item: Service) => item.active && item.attendanceMode === "arrival_order");
      setUnits(activeUnits);
      setServices(arrivalServices);
      setForm((current) => ({ ...current, unitId: activeUnits.find((item: Unit) => item.isDefault)?.id ?? activeUnits[0]?.id ?? "", serviceId: arrivalServices[0]?.id ?? "" }));
      await loadPeriods();
    } catch { setFeedback({ type: "error", message: "Não foi possível carregar os períodos de atendimento." }); }
    finally { setLoading(false); }
  })(); }, []);

  function cancelEdit() { setEditingId(""); setForm((current) => ({ ...initial, unitId: current.unitId, serviceId: current.serviceId })); setFeedback(null); }
  function edit(period: Period) { setEditingId(period.id); setForm({ unitId: period.unitId, serviceId: period.serviceId, weekday: period.weekday, startTime: period.startTime, endTime: period.endTime, capacity: period.capacity === null ? "" : String(period.capacity) }); setFeedback(null); window.scrollTo({ top: 0, behavior: "smooth" }); }
+
+  async function save() {
+    if (!form.unitId || !form.serviceId) { setFeedback({ type: "error", message: "Selecione a unidade e o serviço." }); return; }
+    setSaving(true); setFeedback(null);
+    try {
+      const response = await fetch(editingId ? "/api/v1/scheduling/arrival-periods/" + editingId : "/api/v1/scheduling/arrival-periods", { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, capacity: form.capacity === "" ? null : Number(form.capacity), active: true }) });
+      const body = await response.json().catch(() => null);
+      if (!response.ok) {
+        const messages: Record<string, string> = { arrival_period_conflict: "Já existe um período igual para esta unidade e serviço.", unit_not_found: "A unidade selecionada não está mais disponível.", arrival_order_service_not_found: "Selecione um serviço ativo configurado para ordem de chegada." };
+        throw new Error(messages[body?.error] ?? "Revise os dados do período.");
+      }
+      const wasEditing = Boolean(editingId);
+      await loadPeriods(); cancelEdit();
+      setFeedback({ type: "success", message: wasEditing ? "Período atualizado com sucesso." : "Período adicionado com sucesso." });
+    } catch (error) { setFeedback({ type: "error", message: error instanceof Error ? error.message : "Não foi possível salvar o período." }); }
+    finally { setSaving(false); }
+  }
+
+  async function deactivate(id: string) {
+    if (confirmDeactivate !== id) { setConfirmDeactivate(id); setFeedback({ type: "info", message: "Clique novamente em Desativar para confirmar." }); return; }
+    try {
+      const response = await fetch("/api/v1/scheduling/arrival-periods/" + id, { method: "DELETE" });
+      if (!response.ok) throw new Error();
+      setConfirmDeactivate(""); await loadPeriods();
+      setFeedback({ type: "success", message: "Período desativado. O histórico foi preservado." });
+    } catch { setFeedback({ type: "error", message: "Não foi possível desativar o período." }); }
+  }
+
+  if (loading) return <SisagPage><SisagDataState state="loading" title="Carregando períodos de atendimento" /></SisagPage>;
+  return <SisagPage><SisagPageHeader context={<span className="inline-flex items-center gap-2"><ListOrdered className="h-4 w-4" />Ordem de chegada</span>} title="Períodos de atendimento" description="Defina quando cada serviço recebe clientes por ordem de chegada e quantas intenções podem ser aceitas." />
+    {feedback ? <ActionFeedback type={feedback.type} message={feedback.message} /> : null}
+    <Card className="rounded-2xl border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-lg">{editingId ? "Alterar período" : "Novo período"}</CardTitle><CardDescription>A capacidade limita registros antecipados. A posição na fila será definida somente quando o cliente fizer check-in.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><div><Label>Unidade</Label><select value={form.unitId} onChange={(event) => setForm({ ...form, unitId: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Selecione</option>{units.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div><Label>Serviço por ordem de chegada</Label><select value={form.serviceId} onChange={(event) => setForm({ ...form, serviceId: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Selecione</option>{services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{services.length === 0 ? <Link href="/admin/services" className="mt-2 inline-flex text-xs font-medium text-blue-700 hover:underline">Configurar um serviço para ordem de chegada</Link> : null}</div><div><Label>Dia</Label><select value={form.weekday} onChange={(event) => setForm({ ...form, weekday: Number(event.target.value) })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{WEEKDAYS.map((name, index) => <option key={name} value={index}>{name}</option>)}</select></div><div><Label>Capacidade do período</Label><Input className="mt-1" type="number" min={1} max={10000} value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} placeholder="Sem limite" /><p className="mt-1 text-xs text-slate-500">Deixe vazio para não limitar registros antecipados.</p></div><div><Label>Início</Label><Input className="mt-1" type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></div><div><Label>Fim</Label><Input className="mt-1" type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></div><div className="flex items-end justify-end gap-2 md:col-span-2">{editingId ? <Button variant="outline" onClick={cancelEdit}><X className="mr-2 h-4 w-4" />Cancelar</Button> : null}<Button onClick={() => void save()} disabled={saving || !form.unitId || !form.serviceId || form.startTime >= form.endTime}><Save className="mr-2 h-4 w-4" />{saving ? "Salvando..." : editingId ? "Salvar alteração" : "Adicionar período"}</Button></div></CardContent></Card>
+    {periods.length === 0 ? <SisagDataState state="empty" title="Nenhum período ativo" description="Configure um serviço para ordem de chegada e adicione seu primeiro período de atendimento." /> : <div className="grid gap-4 lg:grid-cols-2">{periods.map((period) => <Card key={period.id} className="rounded-2xl border-slate-200"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{servicesById.get(period.serviceId) ?? "Serviço"}</CardTitle><CardDescription>{unitsById.get(period.unitId) ?? "Unidade"} · {WEEKDAYS[period.weekday]} · {period.startTime} às {period.endTime}</CardDescription></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Ativo</span></div></CardHeader><CardContent><div className="flex items-center justify-between gap-3"><p className="text-sm text-slate-600">{period.capacity === null ? "Registros antecipados sem limite definido" : "Capacidade: " + period.capacity + " registros no período"}</p><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => edit(period)}><Pencil className="mr-2 h-4 w-4" />Alterar</Button><Button variant={confirmDeactivate === period.id ? "destructive" : "outline"} size="sm" onClick={() => void deactivate(period.id)}><Power className="mr-2 h-4 w-4" />{confirmDeactivate === period.id ? "Confirmar" : "Desativar"}</Button></div></div></CardContent></Card>)}</div>}
+  </SisagPage>;
+}
