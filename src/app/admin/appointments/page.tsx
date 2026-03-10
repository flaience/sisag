"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { SearchSelect } from "@/components/SearchSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AppointmentListItem = {
  id: string;
  scheduledTime: string;
  status: string;
  professionalName: string | null;
  clientName: string | null;
};

type SearchItem = {
  id: string;
  name: string;
};

function getStatusClasses(status: string) {
  const normalized = status.toUpperCase();

  if (normalized.includes("CONFIRMED")) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  if (normalized.includes("CANCELLED")) {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (normalized.includes("PENDING")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  return "bg-slate-50 text-slate-700 border-slate-200";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

export default function AppointmentsPage() {
  const [items, setItems] = useState<AppointmentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState("");
  const [professional, setProfessional] = useState<SearchItem | null>(null);

  async function load(params: { search?: string } = {}) {
    setLoading(true);

    try {
      let url = "/api/v1/appointments";
      const q = new URLSearchParams();

      if (params.search) q.set("search", params.search);
      if (date) q.set("date", date);
      if (professional?.id) q.set("professionalId", professional.id);

      if (q.toString()) {
        url += `?${q.toString()}`;
      }

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Agendamentos
          </h1>
          <p className="text-sm text-slate-500">
            Visualize, filtre e gerencie os agendamentos da clínica.
          </p>
        </div>

        <Button asChild className="w-full sm:w-auto">
          <Link href="/admin/appointments/new">+ Novo agendamento</Link>
        </Button>
      </div>

      {/* FILTROS */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Data
              </label>
              <input
                type="date"
                className="w-full rounded-md border border-slate-200 px-3 py-2"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <SearchSelect
              label="Profissional"
              placeholder="Buscar profissional..."
              fetchUrl="/api/v1/professionals/search?q="
              selectedLabel={professional?.name}
              onSelect={(item) => setProfessional(item)}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:max-w-md">
              <SearchBar onSearch={(text) => load({ search: text })} />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDate("");
                  setProfessional(null);
                  load();
                }}
              >
                Limpar
              </Button>

              <Button onClick={() => load()}>Filtrar</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DESKTOP TABLE */}
      <Card className="hidden rounded-2xl md:block">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 text-sm text-slate-500">Carregando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="p-4 text-left text-sm font-medium text-slate-600">
                      Data/Hora
                    </th>
                    <th className="p-4 text-left text-sm font-medium text-slate-600">
                      Cliente
                    </th>
                    <th className="p-4 text-left text-sm font-medium text-slate-600">
                      Profissional
                    </th>
                    <th className="p-4 text-left text-sm font-medium text-slate-600">
                      Status
                    </th>
                    <th className="p-4 text-center text-sm font-medium text-slate-600">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-6 text-center text-sm text-slate-500"
                      >
                        Nenhum agendamento encontrado.
                      </td>
                    </tr>
                  )}

                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="p-4 text-sm text-slate-700">
                        {formatDateTime(item.scheduledTime)}
                      </td>
                      <td className="p-4 text-sm text-slate-700">
                        {item.clientName ?? "—"}
                      </td>
                      <td className="p-4 text-sm text-slate-700">
                        {item.professionalName ?? "—"}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                            item.status,
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center justify-center gap-3 text-sm">
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MOBILE CARDS */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <Card className="rounded-2xl">
            <CardContent className="p-4 text-sm text-slate-500">
              Carregando...
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-4 text-sm text-slate-500">
              Nenhum agendamento encontrado.
            </CardContent>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id} className="rounded-2xl">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">Data/Hora</p>
                    <p className="font-medium text-slate-900">
                      {formatDateTime(item.scheduledTime)}
                    </p>
                  </div>

                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                      item.status,
                    )}`}
                  >
                    {item.status}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Cliente</p>
                  <p className="text-slate-900">{item.clientName ?? "—"}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Profissional</p>
                  <p className="text-slate-900">
                    {item.professionalName ?? "—"}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button asChild variant="outline" className="flex-1">
                    <Link href={`/admin/appointments/${item.id}/edit`}>
                      Editar
                    </Link>
                  </Button>

                  <Button asChild variant="outline" className="flex-1">
                    <Link href={`/admin/appointments/${item.id}/edit?cancel=1`}>
                      Cancelar
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
