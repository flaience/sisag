"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import appointments from "@/data/mockAppointments.json";
import { motion } from "framer-motion";

interface Appointment {
  id: string;
  patient: string;
  doctorId: string;
  time: string;
  status: string;
}

export default function ConfirmarPresenca() {
  const router = useRouter();
  const params = useParams();
  const { doctorId, patientId } = params as {
    doctorId: string;
    patientId: string;
  };
  const [patient, setPatient] = useState<Appointment | null>(null);

  useEffect(() => {
    const data = (appointments as Appointment[]).find(
      (a) => a.id === patientId && a.doctorId === doctorId
    );
    if (data) setPatient(data);
  }, [doctorId, patientId]);

  if (!patient)
    return (
      <main className="flex h-screen items-center justify-center text-xl text-gray-600">
        Paciente não encontrado.
      </main>
    );

  const handleConfirm = () => {
    // Aqui futuramente chamaremos o webhook do n8n
    router.push(
      `/totem/confirm/success?patient=${encodeURIComponent(patient.patient)}`
    );
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white shadow-xl rounded-2xl p-10 max-w-3xl border border-gray-100"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-8">
          Deseja realmente confirmar presença de
          <br />
          <span className="text-gray-900">{patient.patient}?</span>
        </h1>

        <div className="flex flex-col sm:flex-row gap-6 justify-center mt-8">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleConfirm}
            className="px-10 py-4 text-2xl bg-green-600 text-white font-semibold rounded-xl shadow-md hover:bg-green-700"
          >
            ✅ Confirmar Presença
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => router.back()}
            className="px-10 py-4 text-2xl bg-red-500 text-white font-semibold rounded-xl shadow-md hover:bg-red-600"
          >
            ❌ Cancelar / Voltar
          </motion.button>
        </div>
      </motion.div>
    </main>
  );
}
