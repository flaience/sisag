"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ScheduleSlotPicker } from "@/components/ScheduleSlotPicker";
import { SearchSelect } from "@/components/SearchSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SelectedProfessional = {
  id: string;
  name: string;
};

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AgendaPage() {
  const router = useRouter();

  const [selectedProfessional, setSelectedProfessional] =
    useState<SelectedProfessional | null>(null);
  const [date, setDate] = useState(getTodayDate());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const fullSelectedDateTime = useMemo(() => {
    if (!date || !selectedSlot) return null;
    return `${date} ${selectedSlot}`;
  }, [date, selectedSlot]);

  function goToNewAppointment() {
    if (!selectedProfessional || !date || !selectedSlot) return;

    const params = new URLSearchParams({
      professionalId: selectedProfessional.id,
      professionalName: selectedProfessional.name,
      date,
      time: selectedSlot,
    });

    router.push(`/admin/appointments/new?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Agenda clínica
          </h1>
          <p className="text-sm text-slate-500">
            Visualize horários disponíveis e prepare novos agendamentos.
          </p>
        </div>

        <Button
          disabled={!selectedProfessional || !date || !selectedSlot}
          onClick={goToNewAppointment}
        >
          Novo agendamento
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Data selecionada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {date || "--"}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Profissional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-base font-semibold text-slate-900">
              {selectedProfessional?.name || "Não selecionado"}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Horário escolhido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-base font-semibold text-slate-900">
              {selectedSlot || "Nenhum"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Filtros da agenda</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SearchSelect
            label="Profissional"
            placeholder="Buscar profissional..."
            fetchUrl="/api/v1/professionals/search?q="
            selectedLabel={selectedProfessional?.name}
            onSelect={(item) => {
              setSelectedProfessional(item);
              setSelectedSlot(null);
            }}
          />

          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setSelectedSlot(null);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Disponibilidade</CardTitle>
        </CardHeader>

        <CardContent>
          <ScheduleSlotPicker
            professionalId={selectedProfessional?.id ?? ""}
            date={date}
            selectedSlot={selectedSlot}
            onSelect={(time) => setSelectedSlot(time)}
          />
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Resumo da seleção</CardTitle>
        </CardHeader>

        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>
            <span className="font-medium text-slate-900">Data:</span>{" "}
            {date || "-"}
          </p>
          <p>
            <span className="font-medium text-slate-900">Profissional:</span>{" "}
            {selectedProfessional?.name || "-"}
          </p>
          <p>
            <span className="font-medium text-slate-900">
              ID do profissional:
            </span>{" "}
            {selectedProfessional?.id || "-"}
          </p>
          <p>
            <span className="font-medium text-slate-900">Horário:</span>{" "}
            {selectedSlot || "-"}
          </p>
          <p>
            <span className="font-medium text-slate-900">
              Data/hora selecionada:
            </span>{" "}
            {fullSelectedDateTime || "-"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
