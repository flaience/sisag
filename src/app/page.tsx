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
        Bem-vindo à Clínica odontológica d zona nova
      </motion.h1>
      <p className="text-gray-600 text-lg">
        Por favor, selecione uma opção para continuar:
      </p>
    </main>
  );
}
