"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, Circle, Save } from "lucide-react";
import { ActionFeedback } from "@/components/ui/ActionFeedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SisagDataState, SisagPage, SisagPageHeader } from "@/components/sisag";
import { CompanyLogoManager } from "@/components/admin/CompanyLogoManager";
import { getCurrentCompanyProfileReadiness } from "@/modules/companies/CurrentCompanyProfile.readiness";
import type { CurrentCompanyProfile } from "@/modules/companies/CurrentCompanyProfile.service";
import { COMPANY_BUSINESS_TYPE_OPTIONS, normalizeCompanyBusinessTypeValue } from "@/modules/companies/CompanyBusinessType";

type Form = Omit<CurrentCompanyProfile, "id">;
const emptyForm: Form = { name: "", tradeName: null, document: null, address: null, phone: null, email: null, businessType: "generic" };

export default function CurrentCompanyProfilePage() {
  const [profileId, setProfileId] = useState("");
  const [form, setForm] = useState<Form>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  async function load() {
    setLoading(true); setLoadError(false); setFeedback(null);
    try {
      const response = await fetch("/api/v1/me/company/profile", { cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.ok !== true || !body.item) throw new Error("load_failed");
      setProfileId(body.item.id);
      setForm({ name: body.item.name ?? "", tradeName: body.item.tradeName ?? null, document: body.item.document, address: body.item.address, phone: body.item.phone, email: body.item.email, businessType: normalizeCompanyBusinessTypeValue(body.item.businessType) });
    } catch { setLoadError(true); } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const profile = useMemo<CurrentCompanyProfile>(() => ({ id: profileId, ...form }), [profileId, form]);
  const readiness = useMemo(() => getCurrentCompanyProfileReadiness(profile), [profile]);

  function field<K extends keyof Form>(key: K, value: Form[K]) { setForm((current) => ({ ...current, [key]: value })); }

  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setFeedback(null);
    try {
      const response = await fetch("/api/v1/me/company/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.ok !== true) {
        setFeedback({ type: "error", message: body?.message ?? "Revise os campos e tente novamente." }); return;
      }
      setProfileId(body.item.id);
      setForm({ name: body.item.name, tradeName: body.item.tradeName ?? null, document: body.item.document, address: body.item.address, phone: body.item.phone, email: body.item.email, businessType: normalizeCompanyBusinessTypeValue(body.item.businessType) });
      window.dispatchEvent(new Event("company-brand-updated"));
      setFeedback({ type: "success", message: "Empresa salva. O local principal está pronto para os agendamentos." });
    } catch { setFeedback({ type: "error", message: "Não foi possível salvar os dados da empresa." }); }
    finally { setSaving(false); }
  }

  if (loading) return <SisagPage><SisagDataState state="loading" title="Carregando dados da empresa" /></SisagPage>;
  if (loadError) return <SisagPage><SisagDataState state="error" title="Não foi possível carregar a empresa" action={<Button variant="outline" onClick={() => void load()}>Tentar novamente</Button>} /></SisagPage>;

  return (
    <SisagPage>
      <SisagPageHeader context={<span className="inline-flex items-center gap-2"><Building2 className="h-4 w-4" />Configuração operacional</span>} title="Empresa" description="Mantenha os dados usados nos agendamentos, comunicações e documentos." />
      {feedback ? <ActionFeedback type={feedback.type} message={feedback.message} /> : null}
      <CompanyLogoManager />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader><CardTitle>Dados da empresa</CardTitle><CardDescription>O nome informado será exibido para sua equipe e, futuramente, para clientes.</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="name">Razão social ou nome empresarial *</Label><Input id="name" value={form.name} onChange={(event) => field("name", event.target.value)} required minLength={3} maxLength={160} autoComplete="organization" /></div>
                <div className="space-y-2"><Label htmlFor="tradeName">Nome fantasia</Label><Input id="tradeName" value={form.tradeName ?? ""} onChange={(event) => field("tradeName", event.target.value || null)} minLength={2} maxLength={160} placeholder="Nome exibido para a equipe e clientes" /></div>
                <div className="space-y-2"><Label htmlFor="document">Documento</Label><Input id="document" value={form.document ?? ""} onChange={(event) => field("document", event.target.value || null)} maxLength={32} /></div>
                <div className="space-y-2"><Label htmlFor="businessType">Tipo de negócio *</Label><select id="businessType" value={form.businessType} onChange={(event) => field("businessType", event.target.value)} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{COMPANY_BUSINESS_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><p className="text-xs text-slate-500">Usado para adaptar os termos e as configurações iniciais do sistema.</p></div>
                <div className="space-y-2"><Label htmlFor="phone">Telefone</Label><Input id="phone" value={form.phone ?? ""} onChange={(event) => field("phone", event.target.value || null)} autoComplete="tel" maxLength={32} /></div>
                <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" value={form.email ?? ""} onChange={(event) => field("email", event.target.value || null)} autoComplete="email" /></div>
                <div className="space-y-2 md:col-span-2"><Label htmlFor="address">Endereço operacional</Label><Textarea id="address" value={form.address ?? ""} onChange={(event) => field("address", event.target.value || null)} maxLength={500} rows={3} autoComplete="street-address" /></div>
              </div>
              <div className="flex justify-end border-t border-slate-100 pt-5"><Button type="submit" disabled={saving} size="lg" className="rounded-xl"><Save className="mr-2 h-4 w-4" />{saving ? "Salvando..." : "Salvar empresa"}</Button></div>
            </form>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-200 shadow-sm xl:sticky xl:top-6">
          <CardHeader><CardTitle>Prontidão do cadastro</CardTitle><CardDescription>{readiness.completed}/{readiness.total} informações essenciais · {readiness.percentage}%</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${readiness.percentage}%` }} /></div>
            {readiness.checks.map((check) => <div key={check.key} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">{check.complete ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className="h-5 w-5 text-slate-300" />}<span className="text-sm text-slate-700">{check.label}</span></div>)}
            <p className="pt-2 text-sm leading-6 text-slate-500">O sistema mantém um local principal automaticamente. Cadastre outros locais somente quando houver filiais.</p>
          </CardContent>
        </Card>
      </div>
    </SisagPage>
  );
}
