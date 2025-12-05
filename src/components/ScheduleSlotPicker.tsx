//src/components/ScheduleSlotPicker.tsx

"use client";

import { useEffect, useState } from "react";

export function ScheduleSlotPicker({
  professionalId,
  date,
  onSelect,
}: {
  professionalId: string;
  date: string;
  onSelect: (fullDateTime: string) => void;
}) {
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!professionalId || !date) return;

    async function load() {
      setLoading(true);
      setErrorMsg(null);

      const url = `/api/v1/scheduling/available?professionalId=${professionalId}&date=${date}`;

      try {
        const res = await fetch(url);
        const data = await res.json();

        if (res.ok) {
          setSlots(data);
          setErrorMsg(null);
        } else {
          setSlots([]);
          setErrorMsg(data.message ?? "Horário não disponível.");
        }
      } catch (err) {
        setErrorMsg("Erro ao carregar horários.");
        setSlots([]);
      }

      setLoading(false);
    }

    load();
  }, [professionalId, date]);

  if (!professionalId)
    return (
      <div className="text-sm text-gray-500">Selecione o profissional.</div>
    );

  if (!date)
    return <div className="text-sm text-gray-500">Selecione uma data.</div>;

  if (loading) return <div>Carregando horários...</div>;

  if (errorMsg)
    return (
      <div className="p-2 rounded bg-red-50 text-red-700 border border-red-200">
        {errorMsg}
      </div>
    );

  if (slots.length === 0)
    return (
      <div className="p-2 rounded bg-yellow-50 text-yellow-700 border border-yellow-200">
        Nenhum horário disponível para esta data.
      </div>
    );

  return (
    <div className="grid grid-cols-3 gap-2 mt-3">
      {slots.map((time) => (
        <button
          key={time}
          onClick={() => onSelect(time)}
          className="
            border rounded px-2 py-1 text-center
            hover:bg-blue-50 active:bg-blue-100
          "
        >
          {time}
        </button>
      ))}
    </div>
  );
}
