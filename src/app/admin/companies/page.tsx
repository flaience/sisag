"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";

type Company = {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
};

export default function CompaniesPage() {
  const [items, setItems] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  async function load(search = "") {
    setLoading(true);

    const url = search
      ? `/api/v1/companies?search=${encodeURIComponent(search)}`
      : "/api/v1/companies";

    const res = await fetch(url);
    const data = await res.json();
    setItems(data);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta empresa?")) return;

    await fetch(`/api/v1/companies/${id}`, {
      method: "DELETE",
    });

    load();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Empresas</h1>

        <Link
          href="/admin/companies/new"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Nova empresa
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
                <th className="p-2 text-left">Documento</th>
                <th className="p-2 text-left">Telefone</th>
                <th className="p-2 text-left">Email</th>
                <th className="p-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-2">{item.name}</td>
                  <td className="p-2">{item.document ?? "—"}</td>
                  <td className="p-2">{item.phone ?? "—"}</td>
                  <td className="p-2">{item.email ?? "—"}</td>
                  <td className="p-2 text-center space-x-2">
                    <Link
                      href={`/admin/companies/${item.id}/edit`}
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
                    Nenhuma empresa cadastrada
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
