//src/app/admin/companies/new/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormGrid } from "@/components/FormGrid";
import { FormField } from "@/components/FormField";

export default function NewCompanyPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    await fetch("/api/v1/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        document: document || null,
        address: address || null,
        phone: phone || null,
        email: email || null,
      }),
    });

    router.push("/admin/companies");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Nova empresa</h1>

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

          <FormField label="Documento">
            <input
              className="border rounded px-3 py-2 w-full"
              value={document}
              onChange={(e) => setDocument(e.target.value)}
            />
          </FormField>

          <FormField label="Endereço">
            <input
              className="border rounded px-3 py-2 w-full"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </FormField>

          <FormField label="Telefone">
            <input
              className="border rounded px-3 py-2 w-full"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </FormField>

          <FormField label="Email">
            <input
              type="email"
              className="border rounded px-3 py-2 w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
