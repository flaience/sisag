"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormGrid } from "@/components/FormGrid";
import { FormField } from "@/components/FormField";

export default function NewProfessionalPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [avgDuration, setAvgDuration] = useState(20);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    await fetch("/api/v1/professionals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        specialty: specialty || null,
        status,
        avgDuration,
      }),
    });

    router.push("/admin/professionals");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Novo profissional</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded shadow p-4 space-y-4 max-w-2xl"
      >
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

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border rounded"
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}
