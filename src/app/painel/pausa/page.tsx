"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PausaMedico() {
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    if (!selectedOption)
      return alert("Selecione uma opção antes de confirmar.");
    setConfirmed(true);

    // Simulação: aguarda 5 segundos e volta ao painel principal
    setTimeout(() => router.push("/painel/medico"), 5000);
  };

  if (confirmed) {
    return (
      <main className="h-screen flex flex-col items-center justify-center bg-primary text-white text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold mb-4"
        >
          Ação registrada com sucesso
        </motion.h1>
        <p className="text-lg max-w-md">
          Os pacientes serão reagendados conforme sua escolha.
          <br />
          Retornando ao painel em instantes...
        </p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8"
        >
          <div className="w-20 h-20 border-4 border-white rounded-full flex items-center justify-center text-3xl">
            ⏸️
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 py-12 text-center">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-primary mb-6"
      >
        Pausa do Atendimento
      </motion.h1>
      <p className="text-gray-600 mb-10 max-w-lg">
        Selecione o tipo de pausa que deseja realizar. Dependendo da escolha, os
        pacientes poderão ser reagendados automaticamente.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
        {[
          {
            id: "pause-short",
            label: "Pausa curta (volto em instantes)",
            desc: "Interrupção breve — pacientes aguardam na clínica.",
          },
          {
            id: "pause-auto",
            label: "Reagendar pacientes automaticamente",
            desc: "O sistema reagenda automaticamente os pacientes do turno.",
          },
          {
            id: "pause-cancel",
            label: "Cancelar turno de atendimento",
            desc: "Cancela todas as consultas e envia aviso à recepção.",
          },
        ].map((opt) => (
          <motion.div
            key={opt.id}
            whileHover={{ scale: 1.03 }}
            onClick={() => setSelectedOption(opt.id)}
            className={`cursor-pointer bg-white p-6 rounded-2xl border-2 transition text-left ${
              selectedOption === opt.id
                ? "border-primary bg-green-50"
                : "border-gray-200 hover:border-primary"
            }`}
          >
            <h2 className="text-lg font-semibold mb-2 text-gray-800">
              {opt.label}
            </h2>
            <p className="text-gray-600 text-sm">{opt.desc}</p>
          </motion.div>
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
        onClick={() => router.push("/painel/medico")}
        className="mt-6 text-gray-500 underline hover:text-gray-700"
      >
        Voltar ao painel
      </button>
    </main>
  );
}
