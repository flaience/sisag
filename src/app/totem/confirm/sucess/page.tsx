"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

export default function ConfirmSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paciente = searchParams.get("patient");
  const visitante = searchParams.get("visitante");

  const [contador, setContador] = useState(10);

  // Redireciona automaticamente após 10 segundos
  useEffect(() => {
    const intervalo = setInterval(() => {
      setContador((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    const timeout = setTimeout(() => {
      router.push("/totem");
    }, 10000);

    return () => {
      clearInterval(intervalo);
      clearTimeout(timeout);
    };
  }, [router]);

  // (Opcional) Áudio de confirmação — pode ser ligado futuramente
  // useEffect(() => {
  //   const audio = new Audio("/audio/confirmado.mp3");
  //   audio.play();
  // }, []);

  return (
    <main className="min-h-screen bg-green-50 flex flex-col items-center justify-center text-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white shadow-xl rounded-3xl border border-green-200 p-10 max-w-3xl"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 12 }}
          className="text-green-600 text-7xl mb-6"
        >
          ✅
        </motion.div>

        <h1 className="text-3xl md:text-4xl font-bold text-green-700 mb-4">
          Presença Confirmada!
        </h1>

        <p className="text-2xl text-gray-700 font-medium">
          {visitante
            ? "Registro de atendimento realizado com sucesso."
            : `Muito bem, ${paciente || "paciente"}!`}
        </p>

        {!visitante && (
          <p className="text-xl text-gray-600 mt-2">
            O profissional logo irá atendê-lo.
          </p>
        )}

        <p className="text-gray-400 text-lg mt-6">
          Retornando à tela inicial em {contador}s...
        </p>
      </motion.div>
    </main>
  );
}
