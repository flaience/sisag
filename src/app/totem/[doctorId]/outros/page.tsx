"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// mock — no futuro vem da API /api/servicos
const servicosMock = [
  {
    id: 1,
    nome: "Acompanhante",
    descricao: "Acompanha um paciente em consulta",
  },
  {
    id: 2,
    nome: "Fornecedor",
    descricao: "Entrega de materiais ou suprimentos",
  },
  { id: 3, nome: "Técnico", descricao: "Serviços de manutenção" },
  {
    id: 4,
    nome: "Representante",
    descricao: "Visita comercial ou institucional",
  },
];

export default function OutrosServicos() {
  const router = useRouter();
  const params = useParams();
  const { doctorId } = params as { doctorId: string };

  const [selected, setSelected] = useState<number | null>(null);

  const handleConfirm = () => {
    if (!selected) return alert("Selecione um tipo de atendimento.");
    // Futuro: enviar para API ou n8n
    router.push("/totem/confirm/success?visitante=true");
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-6 text-center">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl md:text-4xl font-bold text-primary mb-8"
      >
        Outros Serviços / Atendimentos
      </motion.h1>

      <p className="text-lg text-gray-600 mb-10 max-w-lg">
        Selecione o motivo do seu atendimento com o profissional.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-3xl">
        {servicosMock.map((s) => (
          <motion.button
            key={s.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSelected(s.id)}
            className={`p-6 rounded-2xl border-2 text-left ${
              selected === s.id
                ? "bg-primary text-white border-primary"
                : "bg-white text-gray-800 border-gray-200 hover:border-primary"
            }`}
          >
            <h2 className="text-2xl font-bold mb-2">{s.nome}</h2>
            <p className="text-gray-600 text-sm">{s.descricao}</p>
          </motion.button>
        ))}
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleConfirm}
        className="mt-10 px-10 py-4 bg-green-600 text-white text-xl font-semibold rounded-xl shadow-md hover:bg-green-700"
      >
        Confirmar Atendimento
      </motion.button>

      <button
        onClick={() => router.back()}
        className="mt-6 text-gray-500 underline hover:text-gray-700"
      >
        ← Voltar
      </button>
    </main>
  );
}
