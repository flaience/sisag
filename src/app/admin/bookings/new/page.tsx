// src/app/admin/bookings/new/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  UserRound,
  UserPlus,
  Wrench,
  AlertCircle,
} from "lucide-react";
import { ActionFeedback } from "../[id]/journey/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScheduleSlotPicker } from "@/components/ScheduleSlotPicker";

import {
  parseCurrentBookingCompanyResponse,
  type CurrentBookingCompany,
} from "@/modules/bookings/Booking.current-company-response";

type PersonItem = {
  id: string;
  name: string | null;
  phone?: string | null;
  phoneE164?: string | null;
  email?: string | null;
};

type ProfessionalItem = {
  id: string;
  name: string | null;
};

type UnitItem = {
  id: string;
  name: string;
  active: boolean;
  isDefault: boolean;
};

type ServiceItem = {
  id: string;
  name: string | null;
  durationMinutes?: number | null;
};

function getTodayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function getFeedbackClasses(type: NonNullable<ActionFeedback>["type"]) {
  switch (type) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "error":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "info":
      return "border-sky-200 bg-sky-50 text-sky-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-900";
  }
}

function getErrorMessage(response: any, fallback: string) {
  return response?.message ?? response?.error ?? fallback;
}

export default function NewBookingPage() {
  const router = useRouter();
  const bookingRequestId = useRef<string>(globalThis.crypto?.randomUUID?.() ?? (Date.now().toString(36) + "-panel"));

  const [company, setCompany] = useState<CurrentBookingCompany | null>(null);
  const [people, setPeople] = useState<PersonItem[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [clientId, setClientId] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [quickClientOpen, setQuickClientOpen] = useState(false);
  const [quickClientName, setQuickClientName] = useState("");
  const [quickClientWhatsapp, setQuickClientWhatsapp] = useState("");
  const [quickClientEmail, setQuickClientEmail] = useState("");
  const [savingQuickClient, setSavingQuickClient] = useState(false);
  const [unitId, setUnitId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(getTodayIso());
  const [slot, setSlot] = useState("");
  const [notes, setNotes] = useState("");

  const [actionFeedback, setActionFeedback] = useState<ActionFeedback>(null);

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoadingInitial(true);
        setActionFeedback(null);

        const [companyRes, peopleRes, professionalsRes, servicesRes, unitsRes, configRes] =
          await Promise.all([
            fetch("/api/v1/me/company", { cache: "no-store" }),
            fetch("/api/v1/people", { cache: "no-store" }),
            fetch("/api/v1/professionals", { cache: "no-store" }),
            fetch("/api/v1/services", { cache: "no-store" }),
            fetch("/api/v1/me/company/units", { cache: "no-store" }),
            fetch("/api/v1/settings/scheduling", { cache: "no-store" }),
          ]);

        const companyJson = await companyRes.json().catch(() => null);
        const peopleJson = await peopleRes.json().catch(() => null);
        const professionalsJson = await professionalsRes
          .json()
          .catch(() => null);
        const servicesJson = await servicesRes.json().catch(() => null);
        const unitsJson = await unitsRes.json().catch(() => null);
        const configJson = await configRes.json().catch(() => null);

        const currentCompany = parseCurrentBookingCompanyResponse(companyJson);
        if (!companyRes.ok || !currentCompany) {
          setActionFeedback({
            type: "error",
            message: "Não foi possível identificar a empresa atual.",
          });
          return;
        }

        setCompany(currentCompany);
        setPeople(Array.isArray(peopleJson) ? peopleJson : []);
        setProfessionals(Array.isArray(professionalsJson?.items) ? professionalsJson.items : Array.isArray(professionalsJson) ? professionalsJson : []);
        setServices(Array.isArray(servicesJson?.items) ? servicesJson.items : Array.isArray(servicesJson) ? servicesJson : []);
        const activeUnits = (Array.isArray(unitsJson?.items) ? unitsJson.items : []).filter((item: UnitItem) => item.active);
        setUnits(activeUnits);
        const config = configJson?.config ?? null;
        const fallbackUnitId = activeUnits.find((item: UnitItem) => item.isDefault)?.id ?? (activeUnits.length === 1 ? activeUnits[0].id : "");
        setUnitId(activeUnits.some((item: UnitItem) => item.id === config?.defaultUnitId) ? config.defaultUnitId : fallbackUnitId);
        setServiceId((Array.isArray(servicesJson?.items) ? servicesJson.items : Array.isArray(servicesJson) ? servicesJson : []).some((item: ServiceItem) => item.id === config?.defaultServiceId) ? config.defaultServiceId : "");
        setProfessionalId(config?.defaultProfessionalId ?? "");
      } catch {
        setActionFeedback({
          type: "error",
          message: "Não foi possível carregar os dados do agendamento.",
        });
      } finally {
        setLoadingInitial(false);
      }
    }

    loadInitialData();
  }, []);

  useEffect(() => {
    if (!unitId) return;
    let active = true;
    fetch("/api/v1/professionals?unitId=" + encodeURIComponent(unitId), { cache: "no-store" })
      .then((response) => response.json())
      .then((body) => { if (active) setProfessionals(Array.isArray(body?.items) ? body.items : []); })
      .catch(() => { if (active) setProfessionals([]); });
    return () => { active = false; };
  }, [unitId]);

  const selectedUnit = useMemo(
    () => units.find((item) => item.id === unitId) ?? null,
    [units, unitId],
  );

  const selectedPerson = useMemo(
    () => people.find((item) => item.id === clientId) ?? null,
    [people, clientId],
  );

  const visiblePeople = useMemo(() => {
    const search = clientSearch.trim().toLocaleLowerCase("pt-BR");
    if (!search) return people;
    return people.filter((item) => [item.name, item.phoneE164, item.phone, item.email].some((value) => value?.toLocaleLowerCase("pt-BR").includes(search)));
  }, [people, clientSearch]);

  const selectedProfessional = useMemo(
    () => professionals.find((item) => item.id === professionalId) ?? null,
    [professionals, professionalId],
  );

  const selectedService = useMemo(
    () => services.find((item) => item.id === serviceId) ?? null,
    [services, serviceId],
  );

  async function saveQuickClient() {
    if (!quickClientName.trim() || !quickClientWhatsapp.trim()) { setActionFeedback({ type: "error", message: "Informe o nome e o WhatsApp do cliente." }); return; }
    try {
      setSavingQuickClient(true); setActionFeedback(null);
      const response = await fetch("/api/v1/people/quick", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: quickClientName, whatsapp: quickClientWhatsapp, email: quickClientEmail || null }) });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.item) { setActionFeedback({ type: "error", message: "Não foi possível criar o cliente. Revise o WhatsApp e o e-mail." }); return; }
      const item: PersonItem = { id: body.item.id, name: body.item.name, phoneE164: body.item.phoneE164, email: body.item.email };
      setPeople((current) => current.some((person) => person.id === item.id) ? current : [item, ...current]);
      setClientId(item.id); setClientSearch(""); setQuickClientOpen(false); setQuickClientName(""); setQuickClientWhatsapp(""); setQuickClientEmail("");
      setActionFeedback({ type: "success", message: body.created ? "Cliente criado e selecionado." : "Cliente já existente localizado e selecionado." });
    } catch { setActionFeedback({ type: "error", message: "Não foi possível criar o cliente." }); }
    finally { setSavingQuickClient(false); }
  }

  async function handleSubmit() {
    if (!company?.id) {
      setActionFeedback({
        type: "error",
        message: "Empresa atual não identificada.",
      });
      return;
    }

    if (!unitId) {
      setActionFeedback({
        type: "error",
        message: "Selecione o local de atendimento.",
      });
      return;
    }

    if (!clientId) {
      setActionFeedback({
        type: "error",
        message: "Selecione um cliente.",
      });
      return;
    }

    if (!professionalId) {
      setActionFeedback({
        type: "error",
        message: "Selecione um profissional.",
      });
      return;
    }

    if (!serviceId) {
      setActionFeedback({
        type: "error",
        message: "Selecione um serviço.",
      });
      return;
    }

    if (!date || !slot) {
      setActionFeedback({
        type: "error",
        message: "Selecione uma data e um horário.",
      });
      return;
    }

    try {
      setSubmitting(true);
      setActionFeedback(null);

      const res = await fetch("/api/v1/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId: company.id,
          clientId,
          unitId,
          professionalId,
          serviceId,
          date,
          time: slot,
          notes: notes.trim() || null,
          source: "panel",
          requestId: bookingRequestId.current,
        }),
      });

      const response = await res.json().catch(() => null);

      if (!res.ok || !response?.ok) {
        setActionFeedback({
          type: "error",
          message: getErrorMessage(
            response,
            "Não foi possível criar o agendamento.",
          ),
        });
        return;
      }

      const newBookingId =
        response?.booking?.id ?? response?.bookingId ?? response?.id ?? null;

      if (newBookingId) {
        router.push(`/admin/bookings/${newBookingId}/journey`);
        return;
      }

      router.push("/admin/bookings");
    } catch {
      setActionFeedback({
        type: "error",
        message: "Erro ao criar o agendamento.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingInitial) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Carregando formulário de agendamento...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            <span>{company?.name ?? "Empresa atual"}</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Novo agendamento
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Crie um novo atendimento com profissional, serviço e horário
              disponível.
            </p>
          </div>
        </div>

        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </header>

      {actionFeedback && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${getFeedbackClasses(
            actionFeedback.type,
          )}`}
        >
          {actionFeedback.message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Dados do agendamento</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4"><p className="font-semibold text-sky-950">Escolher o profissional</p><p className="mt-1 text-sm text-sky-800">Os padrões da empresa já foram aplicados. Altere qualquer escolha quando necessário.</p></div>

            <div className="space-y-2">
              <Label htmlFor="unitId">Local de atendimento</Label>
              <select
                id="unitId"
                value={unitId}
                onChange={(event) => {
                  setUnitId(event.target.value);
                  setProfessionalId("");
                  setSlot("");
                }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
              >
                <option value="">Selecione um local</option>
                {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
              </select>
              {units.length === 0 ? <p className="text-xs text-amber-700">Cadastre um local ativo antes de criar agendamentos.</p> : null}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3"><Label htmlFor="clientSearch">Cliente</Label><Button type="button" variant="ghost" size="sm" onClick={() => setQuickClientOpen((current) => !current)}><UserPlus className="mr-2 h-4 w-4" />Novo cliente rápido</Button></div>
              <Input id="clientSearch" value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} placeholder="Buscar por nome, WhatsApp ou e-mail" />
              <select id="clientId" value={clientId} onChange={(event) => setClientId(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"><option value="">Selecione um cliente</option>{visiblePeople.map((person) => <option key={person.id} value={person.id}>{person.name ?? "Cliente sem nome"}{person.phoneE164 || person.phone ? " · " + (person.phoneE164 ?? person.phone) : ""}</option>)}</select>
              {quickClientOpen ? <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4"><div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="quickClientName">Nome</Label><Input id="quickClientName" value={quickClientName} onChange={(event) => setQuickClientName(event.target.value)} placeholder="Nome do cliente" /></div><div><Label htmlFor="quickClientWhatsapp">WhatsApp</Label><Input id="quickClientWhatsapp" value={quickClientWhatsapp} onChange={(event) => setQuickClientWhatsapp(event.target.value)} placeholder="(11) 99999-9999" inputMode="tel" /></div><div className="sm:col-span-2"><Label htmlFor="quickClientEmail">E-mail <span className="font-normal text-slate-500">(opcional)</span></Label><Input id="quickClientEmail" value={quickClientEmail} onChange={(event) => setQuickClientEmail(event.target.value)} placeholder="cliente@exemplo.com" type="email" /></div></div><div className="mt-3 flex justify-end"><Button type="button" onClick={() => void saveQuickClient()} disabled={savingQuickClient}>{savingQuickClient ? "Salvando..." : "Salvar e selecionar"}</Button></div></div> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="professionalId">Profissional</Label>
              <select
                id="professionalId"
                value={professionalId}
                disabled={!unitId}
                onChange={(e) => {
                  setProfessionalId(e.target.value);
                  setSlot("");
                }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
              >
                <option value="">{unitId ? "Selecione um profissional" : "Selecione primeiro o local"}</option>
                {professionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name ?? "Profissional sem nome"}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceId">Serviço</Label>
              <select
                id="serviceId"
                value={serviceId}
                onChange={(e) => {
                  setServiceId(e.target.value);
                  setSlot("");
                }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
              >
                <option value="">Selecione um serviço</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name ?? "Serviço sem nome"}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                min={getTodayIso()}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setSlot("");
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex.: cliente pediu atenção especial"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">
                Resumo do agendamento
              </p>

              <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <span className="inline-flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {selectedUnit?.name ?? "Local não selecionado"}
                </span>

                <span className="inline-flex items-center gap-2">
                  <UserRound className="h-4 w-4" />
                  {selectedPerson?.name ?? "Cliente não selecionado"}
                </span>

                <span className="inline-flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  {selectedService?.name ?? "Serviço não selecionado"}
                </span>

                <span className="inline-flex items-center gap-2">
                  <UserRound className="h-4 w-4" />
                  {selectedProfessional?.name ?? "Profissional não selecionado"}
                </span>

                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {date || "Data não selecionada"}
                </span>

                <span className="inline-flex items-center gap-2">
                  <Clock3 className="h-4 w-4" />
                  {slot || "Horário não selecionado"}
                </span>
              </div>

              {selectedService?.durationMinutes ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                  Duração prevista: {selectedService.durationMinutes} min
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  O horário exibido ao lado considera o local, o profissional, o serviço e as regras vigentes. Ao trocar qualquer seleção, escolha novamente o horário.
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/bookings")}
                disabled={submitting}
              >
                Cancelar
              </Button>

              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Criar agendamento
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Disponibilidade</CardTitle>
          </CardHeader>

          <CardContent>
            <ScheduleSlotPicker
              professionalId={professionalId}
              unitId={unitId}
              companyId={company?.id}
              serviceId={serviceId}
              durationMinutes={selectedService?.durationMinutes ?? undefined}
              date={date}
              selectedSlot={slot}
              onSelect={(selected) => setSlot(selected)}
              title="Horários disponíveis para criação"
              description="Selecione um horário livre considerando o profissional e o serviço escolhidos."
              emptyMessage="Não encontramos horários disponíveis para esta data. Tente outro dia."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
