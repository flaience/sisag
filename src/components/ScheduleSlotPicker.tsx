"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type ScheduleSlotPickerProps = {
  professionalId: string;
  date: string;
  companyId?: string;
  serviceId?: string;
  durationMinutes?: number;
  selectedSlot?: string | null;
  onSelect: (time: string) => void;
};

export function ScheduleSlotPicker({
  professionalId,
  date,
  companyId,
  serviceId,
  durationMinutes,
  selectedSlot,
  onSelect,
}: ScheduleSlotPickerProps) {
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (professionalId) params.set("professionalId", professionalId);
    if (date) params.set("date", date);
    if (companyId) params.set("companyId", companyId);
    if (serviceId) params.set("serviceId", serviceId);
    if (durationMinutes) params.set("durationMinutes", String(durationMinutes));

    return params.toString();
  }, [professionalId, date, companyId, serviceId, durationMinutes]);

  useEffect(() => {
    if (!professionalId || !date) {
      setSlots([]);
      return;
    }

    async function load() {
      setLoading(true);
      setErrorMsg(null);

      try {
        const res = await fetch(`/api/v1/scheduling/available?${queryString}`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (res.ok) {
          setSlots(Array.isArray(data) ? data : []);
          setErrorMsg(null);
        } else {
          setSlots([]);
          setErrorMsg(
            data?.message ?? "Não foi possível carregar os horários.",
          );
        }
      } catch {
        setSlots([]);
        setErrorMsg("Erro ao carregar horários disponíveis.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [professionalId, date, queryString]);

  if (!professionalId) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
        Selecione um profissional para visualizar os horários.
      </div>
    );
  }

  if (!date) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
        Selecione uma data para visualizar os horários.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Carregando horários...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {errorMsg}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        Nenhum horário disponível para esta data.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-slate-900">
          Horários disponíveis
        </h3>
        <p className="text-sm text-slate-500">
          Selecione um horário para criar o agendamento.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {slots.map((time) => {
          const active = selectedSlot === time;

          return (
            <Button
              key={time}
              type="button"
              variant={active ? "default" : "outline"}
              onClick={() => onSelect(time)}
              className="h-11 rounded-xl"
            >
              {time}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
