"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCompany } from "@/hooks/useCompany";
import { getPersonLabel } from "@/lib/businessLabels";

export default function NewPersonPage() {
  const router = useRouter();
  const company = useCompany();
  const label = company ? getPersonLabel(company.businessType) : "Pessoa";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    await fetch("/api/v1/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone: phone || null,
        birthDate: birthDate || null,
        email: email || null,
        notes: notes || null,
      }),
    });

    router.push("/admin/people");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Novo {label}</h1>

      <form
        className="bg-white rounded shadow p-4 space-y-4 max-w-2xl"
        onSubmit={handleSubmit}
      >
        <div>
          <label className="block mb-1 font-medium">Nome</label>
          <input
            className="border rounded px-3 py-2 w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-medium">Telefone</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">E-mail</label>
            <input
              type="email"
              className="border rounded px-3 py-2 w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block mb-1 font-medium">Data de Nascimento</label>
          <input
            type="date"
            className="border rounded px-3 py-2 w-full"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Observações</label>
          <textarea
            className="border rounded px-3 py-2 w-full h-24"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end space-x-2">
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
