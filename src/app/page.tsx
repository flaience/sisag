"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="flex flex-col items-center justify-center h-screen text-center space-y-8">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-bold text-primary"
      >
        Bem-vindo à Clínica Odonto Serra
      </motion.h1>
      <p className="text-gray-600 text-lg">
        Por favor, selecione uma opção para continuar:
      </p>

      <div className="flex gap-6">
        <button
          onClick={() => router.push("/totem")}
          className="px-8 py-4 bg-primary text-white text-xl rounded-2xl shadow-md hover:bg-primary-light"
        >
          Sou paciente
        </button>
        <button
          onClick={() => router.push("/totem/visitante")}
          className="px-8 py-4 bg-gray-200 text-gray-800 text-xl rounded-2xl shadow-md hover:bg-gray-300"
        >
          Outros atendimentos
        </button>
      </div>
    </main>
  );
}
