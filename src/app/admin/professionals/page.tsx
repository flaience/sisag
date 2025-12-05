"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";

type Professional = {
  id: string;
  name: string;
  specialty: string | null;
  status: string | null;
  avgDuration: number | null;
};

export default function ProfessionalsPage() {
  const [items, setItems] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(false);

  async function load(search = "") {
    setLoading(true);

    const url = search
      ? `/api/v1/professionals?search=${encodeURIComponent(search)}`
      : "/api/v1/professionals";

    const res = await fetch(url);
    const data = await res.json();
    setItems(data);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Excluir este profissional?")) return;

    await fetch(`/api/v1/professionals/${id}`, {
      method: "DELETE",
    });

    load();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Profissionais</h1>

        <Link
          href="/admin/professionals/new"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Novo profissional
        </Link>
      </div>
      <SearchBar onSearch={(text) => load(text)} />
      <div className="bg-white rounded shadow overflow-x-auto">
        {loading ? (
          <div className="p-4">Carregando...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Nome</th>
                <th className="p-2 text-left">Especialidade</th>
                <th className="p-2 text-left">Duração</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-2">{item.name}</td>
                  <td className="p-2">{item.specialty ?? "—"}</td>
                  <td className="p-2">{item.avgDuration ?? 20}</td>
                  <td className="p-2">
                    {item.status === "INACTIVE" ? "Inativo" : "Ativo"}
                  </td>
                  <td className="p-2 text-center space-x-2">
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
                  </td>
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    Nenhum profissional cadastrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
