/*src/modules/professionals/Professional.Client.ts*/

"use client";

import { FormGrid } from "@/components/FormGrid";
import { FormField } from "@/components/FormField";

import { useEffect, useState } from "react";

interface Professional {
  id: string;
  name: string;
  specialty: string | null;
  status: string | null;
  avgDuration: number | null;
}

export default function ProfessionalsClient() {
  const [items, setItems] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(false);

  // campos do form
  const [idEditing, setIdEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [avgDuration, setAvgDuration] = useState<number>(20);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/professionals");
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error("Erro ao carregar profissionais", err);
      alert("Erro ao carregar profissionais");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setIdEditing(null);
    setName("");
    setSpecialty("");
    setStatus("ACTIVE");
    setAvgDuration(20);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      alert("Nome é obrigatório");
      return;
    }

    const payload = {
      name,
      specialty: specialty || null,
      status,
      avgDuration,
    };

    try {
      if (idEditing) {
        // UPDATE
        const res = await fetch(`/api/v1/professionals/${idEditing}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Erro ao atualizar");
      } else {
        // CREATE
        const res = await fetch("/api/v1/professionals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Erro ao criar");
      }

      await load();
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar profissional");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Confirma exclusão deste profissional?")) return;
    try {
      const res = await fetch(`/api/v1/professionals/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao excluir");
      await load();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir profissional");
    }
  }

  function handleEdit(prof: Professional) {
    setIdEditing(prof.id);
    setName(prof.name);
    setSpecialty(prof.specialty ?? "");
    setStatus((prof.status as "ACTIVE" | "INACTIVE") ?? "ACTIVE");
    setAvgDuration(prof.avgDuration ?? 20);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Profissionais</h1>

      {/* Formulário de criação/edição */}
      <form
        onSubmit={handleSubmit}
        className="mb-6 bg-white rounded shadow p-4 space-y-4"
      >
        <h2 className="font-semibold text-lg">
          {idEditing ? "Editar profissional" : "Novo profissional"}
        </h2>

        <FormGrid>
          <FormField label="Nome">
            <input
              className="border rounded px-3 py-2 w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>

          <FormField label="Especialidade">
            <input
              className="border rounded px-3 py-2 w-full"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
            />
          </FormField>

          <FormField label="Status">
            <select
              className="border rounded px-3 py-2 w-full"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "ACTIVE" | "INACTIVE")
              }
            >
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
            </select>
          </FormField>

          <FormField label="Duração média (min)">
            <input
              type="number"
              className="border rounded px-3 py-2 w-full"
              value={avgDuration}
              onChange={(e) => setAvgDuration(Number(e.target.value))}
            />
          </FormField>
        </FormGrid>

        <div className="flex justify-end gap-2 pt-4">
          {idEditing && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border rounded"
            >
              Cancelar
            </button>
          )}

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            {idEditing ? "Salvar alterações" : "Adicionar"}
          </button>
        </div>
      </form>

      {/* Tabela */}
      <div className="bg-white rounded shadow">
        {loading ? (
          <div className="p-4">Carregando...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Nome</th>
                <th className="p-2 text-left">Especialidade</th>
                <th className="p-2 text-left">Duração (min)</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    Nenhum profissional cadastrado.
                  </td>
                </tr>
              )}
              {items.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-2">{p.name}</td>
                  <td className="p-2">{p.specialty ?? "—"}</td>
                  <td className="p-2">{p.avgDuration ?? 20}</td>
                  <td className="p-2">
                    {(p.status ?? "ACTIVE") === "ACTIVE" ? "Ativo" : "Inativo"}
                  </td>
                  <td className="p-2 text-center space-x-2">
                    <button
                      onClick={() => handleEdit(p)}
                      className="text-blue-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
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
