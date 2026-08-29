"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Save, UserRound } from "lucide-react";
import { ActionFeedback } from "@/components/ui/ActionFeedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SisagDataState, SisagPage, SisagPageHeader } from "@/components/sisag";

type Unit = { id: string; name: string; active: boolean; isDefault: boolean };
type Link = { unitId: string; unitName: string; active: boolean; isPrimary: boolean };
type Form = { name: string; specialty: string; status: "ACTIVE" | "INACTIVE"; avgDuration: number };
const empty: Form = { name: "", specialty: "", status: "ACTIVE", avgDuration: 20 };

export function ProfessionalForm({ professionalId }: { professionalId?: string }) {
  const router = useRouter(); const editing = Boolean(professionalId);
  const [form, setForm] = useState<Form>(empty); const [units, setUnits] = useState<Unit[]>([]); const [links, setLinks] = useState<Link[]>([]);
  const [selected, setSelected] = useState<string[]>([]); const [primary, setPrimary] = useState("");
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [loadError, setLoadError] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const field = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }));
  async function load() {
    setLoading(true); setLoadError(false);
    try {
      const requests = [fetch("/api/v1/me/company/units", { cache: "no-store" })];
      if (professionalId) requests.push(fetch("/api/v1/professionals/" + professionalId, { cache: "no-store" }), fetch("/api/v1/professionals/" + professionalId + "/units", { cache: "no-store" }));
      const responses = await Promise.all(requests); const bodies = await Promise.all(responses.map((response) => response.json().catch(() => null)));
      if (!responses.every((response) => response.ok)) throw new Error("load_failed");
      const available = (bodies[0]?.items ?? []).filter((item: Unit) => item.active); setUnits(available);
      if (professionalId) { const item = bodies[1]; const currentLinks: Link[] = bodies[2]?.items ?? []; setForm({ name: item.name ?? "", specialty: item.specialty ?? "", status: item.status === "INACTIVE" ? "INACTIVE" : "ACTIVE", avgDuration: item.avgDuration ?? 20 }); setLinks(currentLinks); const active = currentLinks.filter((link) => link.active); setSelected(active.map((link) => link.unitId)); setPrimary(active.find((link) => link.isPrimary)?.unitId ?? active[0]?.unitId ?? ""); }
      else { const preferred = available.find((unit: Unit) => unit.isDefault) ?? available[0]; if (preferred) { setSelected([preferred.id]); setPrimary(preferred.id); } }
    } catch { setLoadError(true); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [professionalId]);
  function toggle(unitId: string, checked: boolean) { setSelected((current) => checked ? [...new Set([...current, unitId])] : current.filter((id) => id !== unitId)); if (!checked && primary === unitId) setPrimary(""); if (checked && !primary) setPrimary(unitId); }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (selected.length === 0) { setFeedback({ type: "error", message: "Selecione ao menos um local de atendimento." }); return; }
    const primaryUnit = selected.includes(primary) ? primary : selected[0]!; setSaving(true); setFeedback(null);
    try {
      const response = await fetch(editing ? "/api/v1/professionals/" + professionalId : "/api/v1/professionals", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, specialty: form.specialty || null }) });
      const body = await response.json().catch(() => null); if (!response.ok) throw new Error(body?.message ?? "Não foi possível salvar o profissional.");
      const id = professionalId ?? body?.item?.id; if (!id) throw new Error("Profissional salvo sem identificação válida.");
      for (const unitId of selected) { const linkResponse = await fetch("/api/v1/professionals/" + id + "/units", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unitId, isPrimary: unitId === primaryUnit }) }); if (!linkResponse.ok) throw new Error("Não foi possível vincular todos os locais."); }
      for (const link of links.filter((item) => item.active && !selected.includes(item.unitId))) { const removeResponse = await fetch("/api/v1/professionals/" + id + "/units/" + link.unitId, { method: "DELETE" }); if (!removeResponse.ok) throw new Error("Não foi possível atualizar todos os locais."); }
      router.push("/admin/professionals"); router.refresh();
    } catch (error) { setFeedback({ type: "error", message: error instanceof Error ? error.message : "Não foi possível salvar o profissional." }); } finally { setSaving(false); }
  }
  if (loading) return <SisagPage><SisagDataState state="loading" title="Carregando profissional" /></SisagPage>;
  if (loadError) return <SisagPage><SisagDataState state="error" title="Não foi possível carregar o cadastro" action={<Button variant="outline" onClick={() => void load()}>Tentar novamente</Button>} /></SisagPage>;
  return <SisagPage><SisagPageHeader context={<span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4" />Equipe de atendimento</span>} title={editing ? "Editar profissional" : "Novo profissional"} description="Defina quem atende, o tempo médio e os locais onde pode receber agendamentos." />
    {feedback ? <ActionFeedback type={feedback.type} message={feedback.message} /> : null}
    <form onSubmit={save} className="space-y-6"><Card className="rounded-2xl border-slate-200 shadow-sm"><CardHeader><CardTitle>Dados profissionais</CardTitle><CardDescription>Use informações reconhecidas pela equipe e pelos clientes.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2"><Label htmlFor="professional-name">Nome *</Label><Input id="professional-name" value={form.name} onChange={(event) => field("name", event.target.value)} required minLength={3} maxLength={160} /></div>
      <div className="space-y-2"><Label htmlFor="specialty">Especialidade ou função</Label><Input id="specialty" value={form.specialty} onChange={(event) => field("specialty", event.target.value)} maxLength={160} placeholder="Ex.: Fisioterapia, Manicure" /></div>
      <div className="space-y-2"><Label htmlFor="duration">Duração média do atendimento</Label><div className="flex items-center gap-2"><Input id="duration" type="number" min={5} max={480} step={5} value={form.avgDuration} onChange={(event) => field("avgDuration", Number(event.target.value))} /><span className="text-sm text-slate-500">minutos</span></div></div>
      <div className="space-y-2"><Label htmlFor="status">Situação</Label><select id="status" value={form.status} onChange={(event) => field("status", event.target.value as Form["status"])} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="ACTIVE">Ativo</option><option value="INACTIVE">Inativo</option></select></div>
    </CardContent></Card>
    <Card className="rounded-2xl border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Locais de atendimento</CardTitle><CardDescription>Selecione onde este profissional atende. O local principal será usado como preferência operacional.</CardDescription></CardHeader><CardContent className="space-y-3">{units.length === 0 ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Cadastre e ative um local de atendimento antes de incluir profissionais.</p> : units.map((unit) => { const checked = selected.includes(unit.id); return <div key={unit.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><label className="flex items-center gap-3"><input type="checkbox" checked={checked} onChange={(event) => toggle(unit.id, event.target.checked)} /><span className="font-medium text-slate-800">{unit.name}</span></label><label className={checked ? "flex items-center gap-2 text-sm text-slate-600" : "pointer-events-none flex items-center gap-2 text-sm text-slate-300"}><input type="radio" name="primary-unit" checked={primary === unit.id} disabled={!checked} onChange={() => setPrimary(unit.id)} />Local principal</label></div>; })}</CardContent></Card>
    <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => router.push("/admin/professionals")}>Cancelar</Button><Button type="submit" disabled={saving || units.length === 0}><Save className="mr-2 h-4 w-4" />{saving ? "Salvando..." : "Salvar profissional"}</Button></div></form>
  </SisagPage>;
}
