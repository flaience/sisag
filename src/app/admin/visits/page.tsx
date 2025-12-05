"use client";

import { useEffect, useState } from "react";

interface VisitType {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

export default function VisitTypesPage() {
  const [visitTypes, setVisitTypes] = useState<VisitType[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function fetchVisitTypes() {
    const res = await fetch("/api/admin/visits");
    const data = await res.json();
    setVisitTypes(data);
  }

  async function addVisitType() {
    if (!name) return alert("Informe o nome do tipo de visita");

    await fetch("/api/admin/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });

    setName("");
    setDescription("");
    fetchVisitTypes();
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch("/api/admin/visits", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !current }),
    });
    fetchVisitTypes();
  }

  useEffect(() => {
    fetchVisitTypes();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary mb-6">Tipos de Visita</h1>

      <div className="bg-white p-4 rounded-xl shadow mb-6">
        <h2 className="font-semibold mb-2">Cadastrar novo</h2>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do tipo"
            className="border p-2 rounded flex-1 min-w-[180px]"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição"
            className="border p-2 rounded flex-1 min-w-[180px]"
          />
          <button
            onClick={addVisitType}
            className="bg-primary text-white px-4 py-2 rounded"
          >
            Adicionar
          </button>
        </div>
      </div>

      <table className="w-full bg-white shadow rounded-xl">
        <thead className="bg-primary text-white">
          <tr>
            <th className="text-left px-4 py-2">Nome</th>
            <th className="text-left px-4 py-2">Descrição</th>
            <th className="text-left px-4 py-2">Status</th>
            <th className="text-left px-4 py-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {visitTypes.map((v) => (
            <tr key={v.id} className="border-b">
              <td className="px-4 py-2">{v.name}</td>
              <td className="px-4 py-2">{v.description ?? "—"}</td>
              <td className="px-4 py-2">
                {v.active ? "🟢 Ativo" : "🔴 Inativo"}
              </td>
              <td className="px-4 py-2">
                <button
                  onClick={() => toggleActive(v.id, v.active)}
                  className={`px-3 py-1 rounded text-sm ${
                    v.active
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-green-500 hover:bg-green-600"
                  } text-white`}
                >
                  {v.active ? "Desativar" : "Ativar"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
