"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCompany } from "@/hooks/useCompany";
import { getPersonLabel } from "@/lib/businessLabels";
import { SearchBar } from "@/components/SearchBar";

type Person = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
};

export default function PeoplePage() {
  const [items, setItems] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);

  const company = useCompany();
  const label = company ? getPersonLabel(company.businessType) : "Pessoa";

  async function load(search = "") {
    setLoading(true);

    const url = search
      ? `/api/v1/people?search=${encodeURIComponent(search)}`
      : "/api/v1/people";

    const res = await fetch(url);
    const data = await res.json();
    setItems(data);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm(`Excluir este ${label.toLowerCase()}?`)) return;

    await fetch(`/api/v1/people/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{label}s</h1>

        <Link
          href="/admin/people/new"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Novo {label.toLowerCase()}
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
                <th className="p-2 text-left">Telefone</th>
                <th className="p-2 text-left">E-mail</th>
                <th className="p-2 text-left">Nascimento</th>
                <th className="p-2 text-center">Ações</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr className="border-t" key={item.id}>
                  <td className="p-2">{item.name}</td>
                  <td className="p-2">{item.phone ?? "—"}</td>
                  <td className="p-2">{item.email ?? "—"}</td>
                  <td className="p-2">{item.birthDate ?? "—"}</td>

                  <td className="p-2 text-center space-x-2">
                    <Link
                      href={`/admin/people/${item.id}/edit`}
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
                    Nenhum {label.toLowerCase()} cadastrado
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
