//src/app/admin/appointments/[id]/edit/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Clock3,
  Mail,
  MessageCircleMore,
  Phone,
  Sparkles,
  Stethoscope,
  UserRound,
  Wrench,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { ScheduleSlotPicker } from "@/components/ScheduleSlotPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AppointmentDetails = {
  id: string;
  scheduledTime: string;
  endTime?: string | null;
  durationMinutes?: number | null;
  serviceNameSnapshot?: string | null;
  status?: string | null;
  companyId?: string | null;
  professionalId: string | null;
  professionalName?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type AppointmentEditPageProps = {
  params: {
    id: string;
  };
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("pt-BR");
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("pt-BR");
}

function formatTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function calculatePreviewEndTime(
  scheduledTime?: string | null,
  durationMinutes?: number | null,
) {
  if (!scheduledTime) return null;

  const start = new Date(scheduledTime);
  if (Number.isNaN(start.getTime())) return null;

  const safeDuration = Math.max(1, Number(durationMinutes ?? 30));
  return new Date(start.getTime() + safeDuration * 60_000).toISOString();
}

function getStatusClasses(status?: string | null) {
  const normalized = status?.toUpperCase?.() ?? "";

  if (normalized.includes("CONFIRMED")) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  if (normalized.includes("CANCELLED")) {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (normalized.includes("PENDING")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (normalized.includes("COMPLETED")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (normalized.includes("RESCHEDULED")) {
    return "bg-violet-50 text-violet-700 border-violet-200";
  }

  return "bg-slate-50 text-slate-700 border-slate-200";
}

function getJourneyStatus(status?: string | null) {
  const normalized = status?.toUpperCase?.() ?? "";

  if (normalized.includes("CONFIRMED")) {
    return {
      preLabel: "Pré-atendimento confirmado",
      preDescription:
        "O atendimento já está confirmado e pode receber orientações, previsão do serviço e preparo do cliente.",
      postLabel: "Pós-atendimento pendente",
      postDescription:
        "Após a realização do serviço, este atendimento pode gerar follow-up, feedback e valorização do cliente.",
    };
  }

  if (normalized.includes("PENDING")) {
    return {
      preLabel: "Pré-atendimento em preparação",
      preDescription:
        "Este atendimento ainda pode passar por confirmação, alinhamento de expectativa e comunicação prévia.",
      postLabel: "Pós-atendimento futuro",
      postDescription:
        "Quando o atendimento for concluído, será possível iniciar ações de acompanhamento e relacionamento.",
    };
  }

  if (normalized.includes("CANCELLED")) {
    return {
      preLabel: "Jornada interrompida",
      preDescription:
        "O atendimento foi cancelado e a experiência pode ser retomada com novo contato ou reagendamento.",
      postLabel: "Pós-atendimento não iniciado",
      postDescription:
        "Como o atendimento não ocorreu, não houve início do fluxo de valorização posterior.",
    };
  }

  if (normalized.includes("COMPLETED")) {
    return {
      preLabel: "Atendimento concluído",
      preDescription:
        "A etapa operacional principal foi finalizada e a jornada já pode avançar para valorização e acompanhamento.",
      postLabel: "Pós-atendimento ativo",
      postDescription:
        "Este atendimento já está pronto para follow-up, retorno, satisfação e ações de relacionamento.",
    };
  }

  return {
    preLabel: "Pré-atendimento",
    preDescription:
      "A etapa anterior ao atendimento pode incluir confirmação, previsão do serviço e orientações ao cliente.",
    postLabel: "Pós-atendimento",
    postDescription:
      "Depois do atendimento, o sistema pode acompanhar satisfação, retorno e relacionamento.",
  };
}

export default function AppointmentEditPage({
  params,
}: AppointmentEditPageProps) {
  const router = useRouter();

  const [form, setForm] = useState<AppointmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [durationMinutes, setDurationMinutes] = useState(30);
  const [serviceNameSnapshot, setServiceNameSnapshot] = useState("");
  const [status, setStatus] = useState("CONFIRMED");

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [date, setDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loadingReschedule, setLoadingReschedule] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const res = await fetch(`/api/v1/appointments/${params.id}`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          setForm(null);
          return;
        }

        const appointment = data?.appointment ?? data ?? null;
        setForm(appointment);

        if (appointment) {
          setDurationMinutes(Number(appointment.durationMinutes ?? 30));
          setServiceNameSnapshot(appointment.serviceNameSnapshot ?? "");
          setStatus(appointment.status ?? "CONFIRMED");
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [params.id]);

  const journey = useMemo(
    () => getJourneyStatus(status || form?.status),
    [status, form?.status],
  );

  const previewEndTime = useMemo(() => {
    return calculatePreviewEndTime(form?.scheduledTime, durationMinutes);
  }, [form?.scheduledTime, durationMinutes]);

  async function reloadAppointment() {
    const res = await fetch(`/api/v1/appointments/${params.id}`, {
      cache: "no-store",
    });

    const data = await res.json();
    const appointment = data?.appointment ?? data ?? null;

    setForm(appointment);

    if (appointment) {
      setDurationMinutes(Number(appointment.durationMinutes ?? 30));
      setServiceNameSnapshot(appointment.serviceNameSnapshot ?? "");
      setStatus(appointment.status ?? "CONFIRMED");
    }
  }

  async function handleSave() {
    if (!form) return;

    if (!durationMinutes || durationMinutes < 1) {
      alert("Informe uma duração válida.");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`/api/v1/appointments/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          durationMinutes,
          serviceNameSnapshot: serviceNameSnapshot.trim() || null,
          status,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.message ?? "Erro ao atualizar agendamento.");
        return;
      }

      alert("Agendamento atualizado com sucesso!");
      await reloadAppointment();
    } catch {
      alert("Erro ao atualizar agendamento.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Deseja cancelar este agendamento com segurança?")) return;

    try {
      setCancelling(true);

      const res = await fetch(`/api/v1/appointments/${params.id}/cancel`, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(
          "Erro ao cancelar: " +
            (err?.message ?? err?.error ?? "Erro desconhecido"),
        );
        return;
      }

      alert("Cancelado com sucesso!");
      router.push("/admin/appointments");
    } finally {
      setCancelling(false);
    }
  }

  async function handleRescheduleConfirm() {
    if (!date || !selectedSlot) {
      alert("Selecione a data e o horário.");
      return;
    }

    try {
      setLoadingReschedule(true);

      const fullDateTime = `${date}T${selectedSlot}:00`;

      const res = await fetch(`/api/v1/appointments/${params.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledTime: fullDateTime }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(
          "Erro ao reagendar: " +
            (err?.message ?? err?.error ?? "Erro desconhecido"),
        );
        return;
      }

      alert("Reagendado com sucesso!");
      closeRescheduleModal();
      await reloadAppointment();
    } finally {
      setLoadingReschedule(false);
    }
  }

  function closeRescheduleModal() {
    setRescheduleOpen(false);
    setSelectedSlot("");
    setDate("");
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Carregando agendamento...
      </div>
    );
  }

  if (!form) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Agendamento não encontrado.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-2xl">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                <UserRound className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-slate-500">Cliente</p>
                <p className="truncate font-medium text-slate-900">
                  {form.clientName ?? "—"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-slate-500">Profissional</p>
                <p className="truncate font-medium text-slate-900">
                  {form.professionalName ?? "—"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Data</p>
                <p className="font-medium text-slate-900">
                  {formatDate(form.scheduledTime)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                  <Clock3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Horário</p>
                  <p className="font-medium text-slate-900">
                    {formatTime(form.scheduledTime)}
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                  status || form.status,
                )}`}
              >
                {status || form.status || "Sem status"}
              </span>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Resumo do atendimento</CardTitle>
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clientName">Cliente</Label>
              <Input
                id="clientName"
                disabled
                value={form.clientName ?? ""}
                className="bg-slate-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="professionalName">Profissional</Label>
              <Input
                id="professionalName"
                disabled
                value={form.professionalName ?? ""}
                className="bg-slate-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientPhone">Telefone</Label>
              <Input
                id="clientPhone"
                disabled
                value={form.clientPhone ?? ""}
                className="bg-slate-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientEmail">E-mail</Label>
              <Input
                id="clientEmail"
                disabled
                value={form.clientEmail ?? ""}
                className="bg-slate-50"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="scheduledTime">Horário atual</Label>
              <Input
                id="scheduledTime"
                disabled
                value={formatDateTime(form.scheduledTime)}
                className="bg-slate-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="durationMinutes">Duração (minutos)</Label>
              <Input
                id="durationMinutes"
                type="number"
                min={1}
                step={1}
                value={durationMinutes}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setDurationMinutes(Number.isNaN(value) ? 30 : value);
                  setSelectedSlot("");
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="PENDING">Pendente</option>
                <option value="CONFIRMED">Confirmado</option>
                <option value="CANCELLED">Cancelado</option>
                <option value="RESCHEDULED">Reagendado</option>
                <option value="COMPLETED">Concluído</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="serviceNameSnapshot">Serviço</Label>
              <div className="relative">
                <Wrench className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="serviceNameSnapshot"
                  value={serviceNameSnapshot}
                  onChange={(e) => setServiceNameSnapshot(e.target.value)}
                  placeholder="Ex.: Consulta ocupacional"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="endTime">Fim previsto</Label>
              <Input
                id="endTime"
                disabled
                value={formatDateTime(previewEndTime ?? form.endTime ?? null)}
                className="bg-slate-50"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircleMore className="h-5 w-5" />
                Pré-atendimento
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">
                  {journey.preLabel}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {journey.preDescription}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-900">
                  Previsão do serviço
                </p>
                <p className="text-sm text-slate-600">
                  Duração atual: {durationMinutes} min
                  {serviceNameSnapshot.trim()
                    ? ` • Serviço: ${serviceNameSnapshot.trim()}`
                    : ""}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-900">
                  Comunicação antecipada
                </p>
                <p className="text-sm text-slate-600">
                  Esse bloco pode receber confirmação, lembrete, checklist e
                  mensagens de orientação prévia.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Pós-atendimento
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">
                  {journey.postLabel}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {journey.postDescription}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-900">
                  Valorização do cliente
                </p>
                <p className="text-sm text-slate-600">
                  Depois do atendimento, este espaço pode mostrar follow-up,
                  pesquisa de satisfação, retorno e ações de relacionamento.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-900">
                  Jornada futura
                </p>
                <p className="text-sm text-slate-600">
                  Também pode receber sugestões de retorno, reativação e
                  histórico de cuidado com o cliente.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Registro do atendimento</CardTitle>
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="createdAt">Criado em</Label>
              <Input
                id="createdAt"
                disabled
                value={formatDateTime(form.createdAt)}
                className="bg-slate-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="updatedAt">Última atualização</Label>
              <Input
                id="updatedAt"
                disabled
                value={formatDateTime(form.updatedAt)}
                className="bg-slate-50"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Ações operacionais</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => setRescheduleOpen(true)}
                disabled={!form.professionalId}
              >
                Reagendar
              </Button>

              <Button
                type="button"
                variant="destructive"
                className="w-full sm:w-auto"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? "Cancelando..." : "Cancelar"}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => router.push("/admin/appointments")}
              >
                Voltar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Modal
        open={rescheduleOpen}
        onClose={closeRescheduleModal}
        title="Reagendar atendimento"
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="newDate">Nova data</Label>
            <Input
              id="newDate"
              type="date"
              min={new Date().toISOString().substring(0, 10)}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setSelectedSlot("");
              }}
            />
          </div>

          <div className="space-y-3">
            {form.professionalId ? (
              <ScheduleSlotPicker
                professionalId={form.professionalId}
                date={date}
                companyId={form.companyId ?? undefined}
                durationMinutes={durationMinutes}
                selectedSlot={selectedSlot}
                onSelect={(slot) => setSelectedSlot(slot)}
              />
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Profissional não identificado para reagendamento.
              </div>
            )}
          </div>

          {selectedSlot && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
              Horário selecionado: {selectedSlot}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={closeRescheduleModal}
            >
              Fechar
            </Button>

            <Button
              type="button"
              onClick={handleRescheduleConfirm}
              disabled={!selectedSlot || !date || loadingReschedule}
            >
              {loadingReschedule ? "Reagendando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
