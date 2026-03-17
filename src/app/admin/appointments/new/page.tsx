"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ScheduleSlotPicker } from "@/components/ScheduleSlotPicker";
import { SearchSelect } from "@/components/SearchSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SearchItem = {
  id: string;
  name: string;
  companyId?: string | null;
};

function AppointmentNewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [professional, setProfessional] = useState<SearchItem | null>(null);
  const [client, setClient] = useState<SearchItem | null>(null);
  const [date, setDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [serviceNameSnapshot, setServiceNameSnapshot] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const professionalId = searchParams.get("professionalId");
    const professionalName = searchParams.get("professionalName");
    const dateParam = searchParams.get("date");
    const timeParam = searchParams.get("time");

    if (professionalId && professionalName) {
      setProfessional({
        id: professionalId,
        name: professionalName,
      });
    }

    if (dateParam) {
      setDate(dateParam);
    }

    if (timeParam) {
      setScheduledTime(timeParam);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!professional || !client || !date || !scheduledTime) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    if (!durationMinutes || durationMinutes < 1) {
      alert("Informe uma duração válida.");
      return;
    }

    const fullDateTime = `${date}T${scheduledTime}:00`;

    try {
      setSaving(true);

      const res = await fetch("/api/v1/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId: professional.id,
          clientId: client.id,
          scheduledTime: fullDateTime,
          durationMinutes,
          serviceNameSnapshot: serviceNameSnapshot.trim() || null,
        }),
      });

      if (res.ok) {
        router.push("/admin/appointments");
        return;
      }

      const data = await res.json().catch(() => null);
      alert(data?.message ?? "Erro ao criar agendamento.");
    } catch {
      alert("Erro ao criar agendamento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Novo agendamento
        </h1>
        <p className="text-sm text-slate-500">
          Selecione o profissional, cliente e horário para registrar um novo
          atendimento.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Dados principais</CardTitle>
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-2">
            <SearchSelect
              label="Profissional"
              placeholder="Buscar profissional..."
              fetchUrl="/api/v1/professionals/search?q="
              selectedLabel={professional?.name}
              onSelect={(item) => {
                setProfessional(item as SearchItem);
                setScheduledTime("");
              }}
            />

            <SearchSelect
              label="Cliente"
              placeholder="Buscar cliente..."
              fetchUrl="/api/v1/people/search?q="
              selectedLabel={client?.name}
              onSelect={(item) => setClient(item as SearchItem)}
            />

            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setScheduledTime("");
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="selectedTime">Horário selecionado</Label>
              <Input
                id="selectedTime"
                value={scheduledTime}
                readOnly
                placeholder="Selecione um horário abaixo"
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
                  setScheduledTime("");
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceNameSnapshot">Serviço (opcional)</Label>
              <Input
                id="serviceNameSnapshot"
                value={serviceNameSnapshot}
                onChange={(e) => setServiceNameSnapshot(e.target.value)}
                placeholder="Ex.: Consulta ocupacional"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Horários disponíveis</CardTitle>
          </CardHeader>

          <CardContent>
            {professional && date ? (
              <ScheduleSlotPicker
                professionalId={professional.id}
                date={date}
                durationMinutes={durationMinutes}
                selectedSlot={scheduledTime}
                onSelect={(time) => {
                  setScheduledTime(time);
                }}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                Selecione um profissional e uma data para visualizar os
                horários.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>

          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-900">Profissional:</span>{" "}
              {professional?.name || "-"}
            </p>
            <p>
              <span className="font-medium text-slate-900">Cliente:</span>{" "}
              {client?.name || "-"}
            </p>
            <p>
              <span className="font-medium text-slate-900">Data:</span>{" "}
              {date || "-"}
            </p>
            <p>
              <span className="font-medium text-slate-900">Horário:</span>{" "}
              {scheduledTime || "-"}
            </p>
            <p>
              <span className="font-medium text-slate-900">Duração:</span>{" "}
              {durationMinutes ? `${durationMinutes} min` : "-"}
            </p>
            <p>
              <span className="font-medium text-slate-900">Serviço:</span>{" "}
              {serviceNameSnapshot.trim() || "-"}
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/agenda")}
          >
            Cancelar
          </Button>

          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar agendamento"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function AppointmentNewPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Novo agendamento
          </h1>
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            Carregando formulário...
          </div>
        </div>
      }
    >
      <AppointmentNewContent />
    </Suspense>
  );
}
