"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";

export default function VisitantePage() {
  const router = useRouter();
  const [reason, setReason] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleConfirm = () => {
    if (!reason) return alert("Selecione um motivo da visita.");
    setSubmitted(true);

    // Simula um envio de dados (futuro: integração com n8n)
    setTimeout(() => {
      router.push("/"); // retorna à tela inicial
    }, 6000);
  };

  if (submitted) {
    return (
      <main className="h-screen flex flex-col items-center justify-center bg-primary text-white text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold mb-4"
        >
          Obrigado por registrar sua entrada!
        </motion.h1>
        <p className="text-lg max-w-md">
          Um atendente foi notificado sobre sua presença. Por favor, aguarde
          alguns instantes.
        </p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-8"
        >
          <div className="w-20 h-20 border-4 border-white rounded-full flex items-center justify-center text-3xl">
            👋
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <h1 className="text-3xl font-bold text-primary mb-6">
        Outros Atendimentos
      </h1>
      <p className="text-gray-600 mb-10 max-w-md">
        Se você não é paciente, selecione o motivo da sua visita:
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-lg">
        {[
          "Acompanhante",
          "Entrega / Fornecedor",
          "Manutenção / Técnico",
          "Outro motivo",
        ].map((item) => (
          <motion.button
            key={item}
            whileHover={{ scale: 1.05 }}
            onClick={() => setReason(item)}
            className={`px-6 py-4 rounded-xl border-2 ${
              reason === item
                ? "bg-primary text-white border-primary"
                : "bg-white text-gray-700 border-gray-200 hover:border-primary"
            }`}
          >
            {item}
          </motion.button>
        ))}
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleConfirm}
        className="mt-10 px-10 py-4 bg-primary text-white text-lg rounded-xl shadow-md hover:bg-primary-light"
      >
        Confirmar
      </motion.button>

      <button
        onClick={() => router.push("/")}
        className="mt-6 text-gray-500 underline hover:text-gray-700"
      >
        Voltar à tela inicial
      </button>
    </main>
  );
}
