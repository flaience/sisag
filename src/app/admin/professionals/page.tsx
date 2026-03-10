"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Professional = {
  id: string;
  name: string;
  specialty: string | null;
  status: string | null;
  avgDuration: number | null;
};

function getStatusLabel(status: string | null) {
  return status === "INACTIVE" ? "Inativo" : "Ativo";
}

function getStatusClasses(status: string | null) {
  if (status === "INACTIVE") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

export default function ProfessionalsPage() {
  const [items, setItems] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  async function load(searchText = "") {
    setLoading(true);

    try {
      const url = searchText
        ? `/api/v1/professionals?search=${encodeURIComponent(searchText)}`
        : "/api/v1/professionals";

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

  async function handleDelete(id: string) {
    if (!confirm("Excluir este profissional?")) return;

    await fetch(`/api/v1/professionals/${id}`, {
      method: "DELETE",
    });

    load(search);
  }

  function handleSearch(text: string) {
    setSearch(text);
    load(text);
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Profissionais
          </h1>
          <p className="text-sm text-slate-500">
            Gerencie os profissionais e acompanhe disponibilidade operacional.
          </p>
        </div>

        <Button asChild className="w-full sm:w-auto">
          <Link href="/admin/professionals/new">+ Novo profissional</Link>
        </Button>
      </div>

      {/* BUSCA */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Busca</CardTitle>
        </CardHeader>
        <CardContent>
          <SearchBar onSearch={handleSearch} />
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
                      Nome
                    </th>
                    <th className="p-4 text-left text-sm font-medium text-slate-600">
                      Especialidade
                    </th>
                    <th className="p-4 text-left text-sm font-medium text-slate-600">
                      Duração média
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
                        Nenhum profissional cadastrado.
                      </td>
                    </tr>
                  )}

                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="p-4 text-sm text-slate-700">
                        {item.name}
                      </td>
                      <td className="p-4 text-sm text-slate-700">
                        {item.specialty ?? "—"}
                      </td>
                      <td className="p-4 text-sm text-slate-700">
                        {item.avgDuration ?? 20} min
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                            item.status,
                          )}`}
                        >
                          {getStatusLabel(item.status)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-3 text-sm">
                          <Link
                            href={`/admin/professionals/${item.id}/edit`}
                            className="text-blue-600 hover:underline"
                          >
                            Editar
                          </Link>

                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:underline"
                          >
                            Excluir
                          </button>
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
              Nenhum profissional cadastrado.
            </CardContent>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id} className="rounded-2xl">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">Nome</p>
                    <p className="font-medium text-slate-900">{item.name}</p>
                  </div>

                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                      item.status,
                    )}`}
                  >
                    {getStatusLabel(item.status)}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Especialidade</p>
                  <p className="text-slate-900">{item.specialty ?? "—"}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Duração média</p>
                  <p className="text-slate-900">{item.avgDuration ?? 20} min</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button asChild variant="outline" className="flex-1">
                    <Link href={`/admin/professionals/${item.id}/edit`}>
                      Editar
                    </Link>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleDelete(item.id)}
                  >
                    Excluir
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
