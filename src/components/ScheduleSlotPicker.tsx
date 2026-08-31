//src/components/ScheduleSlotPicker.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type ScheduleSlotPickerProps = {
  professionalId: string;
  unitId?: string;
  date: string;
  companyId?: string;
  serviceId?: string;
  durationMinutes?: number;
  selectedSlot?: string | null;
  onSelect: (time: string) => void;
  title?: string;
  description?: string;
  emptyMessage?: string;
};

function getErrorMessage(data: any, fallback: string) {
  return data?.message ?? data?.error ?? fallback;
}

export function ScheduleSlotPicker({
  professionalId,
  unitId,
  date,
  companyId,
  serviceId,
  durationMinutes,
  selectedSlot,
  onSelect,
  title = "Horários disponíveis",
  description = "Selecione um horário para continuar.",
  emptyMessage = "Nenhum horário disponível para esta data.",
}: ScheduleSlotPickerProps) {
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (professionalId) params.set("professionalId", professionalId);
    if (unitId) params.set("unitId", unitId);
    if (date) params.set("date", date);
    if (companyId) params.set("companyId", companyId);
    if (serviceId) params.set("serviceId", serviceId);
    if (durationMinutes) {
      params.set("durationMinutes", String(durationMinutes));
    }

    return params.toString();
  }, [professionalId, unitId, date, companyId, serviceId, durationMinutes]);

  async function loadSlots() {
    if (!professionalId || !date) {
      setSlots([]);
      setErrorMsg(null);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await fetch(`/api/v1/scheduling/available?${queryString}`, {
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setSlots([]);
        setErrorMsg(
          getErrorMessage(data, "Não foi possível carregar os horários."),
        );
        return;
      }

      const normalizedSlots = Array.isArray(data)
        ? data.filter((item): item is string => typeof item === "string")
        : [];

      setSlots(normalizedSlots);
      setErrorMsg(null);
    } catch {
      setSlots([]);
      setErrorMsg("Erro ao carregar horários disponíveis.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSlots();
  }, [queryString, professionalId, date]);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Clock3 className="h-4 w-4" />
            {title}
          </h3>

          <p className="mt-1 text-sm text-slate-500">{description}</p>

          {durationMinutes ? (
            <p className="mt-2 text-xs text-slate-500">
              Duração prevista considerada: {durationMinutes} min
            </p>
          ) : null}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadSlots}
          disabled={loading}
          className="shrink-0"
        >
          <RefreshCcw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          {loading ? "Atualizando..." : "Atualizar"}
        </Button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Carregando horários...
        </div>
      ) : null}

      {!loading && errorMsg ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {errorMsg}
        </div>
      ) : null}

      {!loading && !errorMsg && slots.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          {emptyMessage}
        </div>
      ) : null}

      {!loading && !errorMsg && slots.length > 0 ? (
        <>
          {selectedSlot ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <span className="inline-flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Horário selecionado: {selectedSlot}
              </span>
            </div>
          ) : (
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
              Escolha um horário disponível para continuar.
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {slots.map((time) => {
              const active = selectedSlot === time;

              return (
                <Button
                  key={time}
                  type="button"
                  variant={active ? "default" : "outline"}
                  onClick={() => onSelect(time)}
                  className={`h-11 rounded-xl justify-center ${
                    active ? "ring-2 ring-offset-2" : ""
                  }`}
                >
                  {time}
                </Button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
