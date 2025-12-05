//src/app/admin/appointments/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";

type AppointmentListItem = {
  id: string;
  scheduledTime: string;
  status: string;
  professionalName: string | null;
  clientName: string | null;
};

export default function AppointmentsPage() {
  const [items, setItems] = useState<AppointmentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState("");
  const [professionalId, setProfessionalId] = useState("");

  async function load(params: { search?: string } = {}) {
    setLoading(true);

    let url = "/api/v1/appointments";

    const q = new URLSearchParams();

    if (params.search) q.set("search", params.search);
    if (date) q.set("date", date);
    if (professionalId) q.set("professionalId", professionalId);

    if (q.toString()) url += "?" + q.toString();

    const res = await fetch(url);
    const data = await res.json();

    setItems(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Agendamentos</h1>

        <Link
          href="/admin/appointments/new"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Novo agendamento
        </Link>
      </div>

      {/* FILTROS SUPERIORES */}
      <div className="flex gap-4 mb-4">
        <div>
          <label className="block mb-1 text-sm">Data</label>
          <input
            type="date"
            className="border rounded px-2 py-1"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block mb-1 text-sm">Profissional (ID)</label>
          <input
            type="text"
            className="border rounded px-2 py-1"
            placeholder="Opcional"
            value={professionalId}
            onChange={(e) => setProfessionalId(e.target.value)}
          />
        </div>

        <button
          onClick={() => load()}
          className="self-end bg-gray-200 px-3 py-1 rounded"
        >
          Filtrar
        </button>
      </div>

      {/* BARRA DE BUSCA (CLIENTE) */}
      <SearchBar onSearch={(text) => load({ search: text })} />

      <div className="bg-white rounded shadow overflow-x-auto">
        {loading ? (
          <div className="p-4">Carregando...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Data/Hora</th>
                <th className="p-2 text-left">Cliente</th>
                <th className="p-2 text-left">Profissional</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-center">Ações</th>
              </tr>
            </thead>

            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    Nenhum agendamento encontrado.
                  </td>
                </tr>
              )}

              {items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-2">
                    {new Date(item.scheduledTime).toLocaleString()}
                  </td>
                  <td className="p-2">{item.clientName ?? "—"}</td>
                  <td className="p-2">{item.professionalName ?? "—"}</td>
                  <td className="p-2">{item.status}</td>

                  <td className="p-2 text-center space-x-2">
                    <Link
                      href={`/admin/appointments/${item.id}/edit`}
                      className="text-blue-600 hover:underline"
                    >
                      Editar
                    </Link>
                    <Link
                      href={`/admin/appointments/${item.id}/edit?cancel=1`}
                      className="text-red-600 hover:underline"
                    >
                      Cancelar
                    </Link>
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
