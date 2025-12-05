"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect } from "react";

export default function ConfirmacaoPresenca() {
  const params = useSearchParams();
  const router = useRouter();
  const patient = params.get("patient");
  const doctor = params.get("doctor");

  useEffect(() => {
    const timer = setTimeout(() => router.push("/"), 7000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="h-screen flex flex-col items-center justify-center text-center bg-primary text-white px-6">
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-bold mb-4"
      >
        Muito bem, {patient}!
      </motion.h1>
      <p className="text-lg max-w-md">
        Sua presença foi confirmada. <br />
        Fique à vontade na sala de espera — o {doctor} irá atendê-lo em breve.
      </p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="mt-8"
      >
        <div className="w-20 h-20 border-4 border-white rounded-full flex items-center justify-center text-3xl">
          ✅
        </div>
      </motion.div>
    </main>
  );
}
