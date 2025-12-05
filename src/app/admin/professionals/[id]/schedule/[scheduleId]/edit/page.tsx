"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const WEEKDAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

export default function EditSchedulePage({ params }: any) {
  const router = useRouter();
  const professionalId = params.id;
  const scheduleId = params.scheduleId;

  const [weekday, setWeekday] = useState(1);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("12:00");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch(
      `/api/v1/professionals/${professionalId}/schedules`
    );
    const list = await res.json();
    const item = list.find((x: any) => x.id === scheduleId);

    if (!item) return;

    setWeekday(item.weekday);
    setStartTime(item.startTime);
    setEndTime(item.endTime);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: any) {
    e.preventDefault();

    await fetch(
      `/api/v1/professionals/${professionalId}/schedules/${scheduleId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekday,
          startTime,
          endTime,
        }),
      }
    );

    router.push(`/admin/professionals/${professionalId}/schedules`);
  }

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Editar Horário</h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-white p-4 shadow rounded"
      >
        <label className="block">
          Dia da semana
          <select
            className="border p-2 rounded w-full mt-1"
            value={weekday}
            onChange={(e) => setWeekday(Number(e.target.value))}
          >
            {WEEKDAYS.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          Início
          <input
            type="time"
            className="border p-2 rounded w-full mt-1"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </label>

        <label className="block">
          Fim
          <input
            type="time"
            className="border p-2 rounded w-full mt-1"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </label>

        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          Salvar alterações
        </button>
      </form>
    </div>
  );
}
