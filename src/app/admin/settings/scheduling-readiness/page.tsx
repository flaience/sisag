"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarCheck2, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { ActionFeedback } from "@/components/ui/ActionFeedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SisagDataState, SisagPage, SisagPageHeader } from "@/components/sisag";

type Unit = { id: string; name: string; active: boolean; isDefault?: boolean };
type Service = { id: string; name: string; active?: boolean };
type Professional = { id: string; name: string };
type CheckKey = "unit" | "service" | "service_duration" | "professional" | "professional_unit" | "professional_service" | "professional_schedule" | "assignment_coverage";
type Readiness = { ready: boolean; checks: Array<{ key: CheckKey; status: "ready" | "missing" }>; warnings: Array<{ code: string; count: number }>; readOnly: true };

const labels: Record<CheckKey, { title: string; description: string; href: (professionalId: string) => string }> = {
  unit: { title: "Local ativo", description: "O local selecionado precisa estar ativo.", href: () => "/admin/settings/units" },
  service: { title: "Serviço ativo", description: "O serviço selecionado precisa estar ativo.", href: () => "/admin/services" },
  service_duration: { title: "Duração do serviço", description: "Informe uma duração válida para gerar os horários.", href: () => "/admin/services" },
  professional: { title: "Profissional ativo", description: "O profissional precisa estar ativo.", href: () => "/admin/professionals" },
  professional_unit: { title: "Profissional no local", description: "Habilite o profissional para atender neste local.", href: (id) => "/admin/professionals/" + id + "/edit" },
  professional_service: { title: "Profissional no serviço", description: "Habilite o serviço para este profissional.", href: (id) => "/admin/professionals/" + id + "/services" },
  professional_schedule: { title: "Horário de atendimento", description: "Cadastre ao menos um período de trabalho neste local.", href: (id) => "/admin/professionals/" + id + "/availability" },
  assignment_coverage: { title: "Distribuição coberta pelo horário", description: "Crie um turno que esteja totalmente dentro do horário do profissional.", href: () => "/admin/settings/service-assignments" },
};

export default function SchedulingReadinessPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selection, setSelection] = useState({ unitId: "", serviceId: "", professionalId: "" });
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [loadingReferences, setLoadingReferences] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canCheck = Boolean(selection.unitId && selection.serviceId && selection.professionalId);
  const selectedProfessional = useMemo(() => professionals.find((item) => item.id === selection.professionalId), [professionals, selection.professionalId]);

  async function loadProfessionals(unitId: string) {
    if (!unitId) { setProfessionals([]); return; }
    const response = await fetch("/api/v1/professionals?unitId=" + encodeURIComponent(unitId), { cache: "no-store" });
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.ok !== true) throw new Error("professionals");
    setProfessionals(body.items ?? []);
  }

  useEffect(() => { void (async () => {
    try {
      const [unitResponse, serviceResponse] = await Promise.all([fetch("/api/v1/me/company/units", { cache: "no-store" }), fetch("/api/v1/services", { cache: "no-store" })]);
      const unitBody = await unitResponse.json(); const serviceBody = await serviceResponse.json();
      if (unitBody?.ok !== true || !serviceResponse.ok) throw new Error("references");
      const activeUnits = (unitBody.items ?? []).filter((item: Unit) => item.active);
      const activeServices = (serviceBody.items ?? serviceBody ?? []).filter((item: Service) => item.active !== false);
      const unitId = activeUnits.find((item: Unit) => item.isDefault)?.id ?? activeUnits[0]?.id ?? "";
      setUnits(activeUnits); setServices(activeServices); setSelection((current) => ({ ...current, unitId }));
      if (unitId) await loadProfessionals(unitId);
    } catch { setError("Não foi possível carregar os dados para a verificação."); }
    finally { setLoadingReferences(false); }
  })(); }, []);

  async function changeUnit(unitId: string) {
    setSelection({ unitId, serviceId: selection.serviceId, professionalId: "" }); setReadiness(null); setError(null);
    try { await loadProfessionals(unitId); } catch { setProfessionals([]); setError("Não foi possível carregar os profissionais deste local."); }
  }

  async function check() {
    if (!canCheck) return;
    setChecking(true); setError(null); setReadiness(null);
    try {
      const query = new URLSearchParams(selection);
      const response = await fetch("/api/v1/scheduling/readiness?" + query.toString(), { cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.ok !== true) throw new Error("readiness");
      setReadiness(body.readiness);
    } catch { setError("Não foi possível verificar esta agenda agora. Tente novamente."); }
    finally { setChecking(false); }
  }

  if (loadingReferences) return <SisagPage><SisagDataState state="loading" title="Preparando verificação da agenda" /></SisagPage>;
  return <SisagPage>
    <SisagPageHeader context={<span className="inline-flex items-center gap-2"><CalendarCheck2 className="h-4 w-4" />Agendamento</span>} title="Verificação da agenda" description="Escolha uma combinação para descobrir exatamente o que está pronto e o que ainda precisa ser configurado." />
    {error ? <ActionFeedback type="error" message={error} /> : null}
    <Card className="rounded-2xl border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-lg">Agenda que deseja verificar</CardTitle><CardDescription>A verificação é somente leitura e não altera nenhuma configuração.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-3">
      <div><Label>Local</Label><select value={selection.unitId} onChange={(event) => void changeUnit(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Selecione</option>{units.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      <div><Label>Serviço</Label><select value={selection.serviceId} onChange={(event) => { setSelection({ ...selection, serviceId: event.target.value }); setReadiness(null); }} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Selecione</option>{services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      <div><Label>Profissional</Label><select value={selection.professionalId} onChange={(event) => { setSelection({ ...selection, professionalId: event.target.value }); setReadiness(null); }} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">{selection.unitId ? professionals.length ? "Selecione" : "Nenhum profissional neste local" : "Selecione primeiro o local"}</option>{professionals.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      <div className="md:col-span-3 flex justify-end"><Button disabled={!canCheck || checking} onClick={() => void check()}><RefreshCw className={"mr-2 h-4 w-4 " + (checking ? "animate-spin" : "")} />{checking ? "Verificando..." : "Verificar agenda"}</Button></div>
    </CardContent></Card>
    {readiness ? <>
      <div className={readiness.ready ? "rounded-2xl border border-emerald-200 bg-emerald-50 p-5" : "rounded-2xl border border-amber-200 bg-amber-50 p-5"}><div className="flex items-start gap-3">{readiness.ready ? <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-700" /> : <AlertTriangle className="mt-0.5 h-6 w-6 text-amber-700" />}<div><h2 className="font-semibold text-slate-950">{readiness.ready ? "Agenda pronta para receber agendamentos" : "Ainda existem configurações pendentes"}</h2><p className="mt-1 text-sm text-slate-600">{readiness.ready ? "A combinação selecionada passou por todas as verificações." : "Corrija os itens destacados abaixo e verifique novamente."}</p></div></div></div>
      <div className="grid gap-4 md:grid-cols-2">{readiness.checks.map((item) => { const copy = labels[item.key]; const ready = item.status === "ready"; return <Card key={item.key} className={ready ? "rounded-2xl border-emerald-200" : "rounded-2xl border-rose-200"}><CardContent className="flex items-start gap-3 p-5">{ready ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />}<div className="min-w-0 flex-1"><h3 className="font-medium text-slate-950">{copy.title}</h3><p className="mt-1 text-sm text-slate-600">{ready ? "Configuração encontrada e válida." : copy.description}</p>{!ready ? <Link className="mt-3 inline-flex text-sm font-medium text-blue-700 hover:underline" href={copy.href(selection.professionalId)}>Corrigir configuração</Link> : null}</div></CardContent></Card>; })}</div>
      {readiness.warnings.some((item) => item.code === "active_availability_exceptions") ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Atenção:</strong> existem bloqueios ou exceções ativos que podem retirar horários desta agenda. <Link className="font-medium underline" href="/admin/settings/availability-exceptions">Revisar feriados e bloqueios</Link>.</div> : null}
      <p className="text-xs text-slate-500">Resultado somente leitura para {selectedProfessional?.name ?? "o profissional selecionado"}. Nenhuma configuração foi alterada.</p>
    </> : <SisagDataState state="empty" title="Selecione os dados e verifique" description="O checklist mostrará cada requisito da agenda e o caminho para corrigir pendências." />}
  </SisagPage>;
}
