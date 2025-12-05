"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import doctors from "@/data/mockDoctors.json";

export default function TotemHome() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-6">
      {/* título */}
      <motion.h1
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl md:text-5xl font-bold text-primary text-center drop-shadow-sm"
      >
        Clínica Odonto Serra
      </motion.h1>

      {/* mensagem orientativa (sem 'por gentileza') */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mt-6 text-center text-3xl md:text-4xl font-bold text-gray-700 leading-snug"
      >
        👆 Toque na imagem do profissional que irá lhe atender
      </motion.p>

      {/* grade de profissionais */}
      <section className="w-full max-w-5xl mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {doctors.map((doc: any) => (
          <motion.button
            key={doc.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push(`/totem/${doc.id}`)}
            className="group bg-white rounded-2xl shadow-lg border border-gray-200 hover:border-primary/50 transition p-6"
          >
            <div className="flex flex-col items-center">
              <img
                src={doc.photo}
                alt={doc.name}
                className="w-40 h-40 rounded-full object-cover border-4 border-primary/20 group-hover:border-primary transition"
              />
              <h2 className="mt-5 text-2xl font-semibold text-gray-900 text-center">
                {doc.name}
              </h2>
              <p className="text-gray-500 text-base text-center">{doc.title}</p>
            </div>
          </motion.button>
        ))}
      </section>
    </main>
  );
}
