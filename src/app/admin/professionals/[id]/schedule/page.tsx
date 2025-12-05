"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Schedule {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

const WEEKDAYS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export default function ProfessionalSchedulesPage({ params }: any) {
  const professionalId = params.id;

  const [items, setItems] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/professionals/${professionalId}/schedules`
      );
      const data = await res.json();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este horário?")) return;

    await fetch(`/api/v1/professionals/${professionalId}/schedules/${id}`, {
      method: "DELETE",
    });

    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Horários do Profissional</h1>

        <Link
          href={`/admin/professionals/${professionalId}/schedules/new`}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Novo horário
        </Link>
      </div>

      <div className="bg-white rounded shadow">
        {loading ? (
          <div className="p-4">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            Nenhum horário cadastrado.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Dia da semana</th>
                <th className="p-2 text-left">Início</th>
                <th className="p-2 text-left">Fim</th>
                <th className="p-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-2">{WEEKDAYS[s.weekday]}</td>
                  <td className="p-2">{s.startTime}</td>
                  <td className="p-2">{s.endTime}</td>
                  <td className="p-2 text-center space-x-3">
                    <Link
                      className="text-blue-600 hover:underline"
                      href={`/admin/professionals/${professionalId}/schedules/${s.id}/edit`}
                    >
                      Editar
                    </Link>

                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-red-600 hover:underline"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
