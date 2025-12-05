"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import appointments from "@/data/mockAppointments.json";

interface Appointment {
  id: string;
  patient: string;
  doctorId: string;
  time: string;
  status: string;
}

export default function DoctorAppointments() {
  const router = useRouter();
  const params = useParams();
  const doctorId = params?.doctorId as string;
  const [list, setList] = useState<Appointment[]>([]);

  useEffect(() => {
    const data = (appointments as Appointment[]).filter(
      (a) => a.doctorId === doctorId
    );
    setList(data);
  }, [doctorId]);

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center py-6 px-4">
      {/* instrução compacta */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-primary/10 border border-primary/20 rounded-xl px-6 py-3 mb-6 text-center max-w-3xl"
      >
        <p className="text-2xl md:text-3xl font-bold text-primary leading-snug">
          👇 Toque em <span className="underline">Confirmar Presença</span> para
          seu nome
        </p>
      </motion.div>

      {/* tabela enxuta */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-primary text-white text-xl">
            <tr>
              <th className="px-6 py-3 w-1/2">Paciente</th>
              <th className="px-6 py-3 w-1/4">Horário</th>
              <th className="px-6 py-3 w-1/4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {list.map((item, i) => (
              <motion.tr
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-6 py-4 text-xl text-gray-800 font-semibold">
                  {item.patient}
                </td>
                <td className="px-6 py-4 text-lg text-gray-700">{item.time}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() =>
                      router.push(`/totem/${doctorId}/confirmar/${item.id}`)
                    }
                    className="px-6 py-2 bg-green-600 text-white text-lg font-bold rounded-lg shadow hover:bg-green-700"
                  >
                    Confirmar Presença
                  </button>
                </td>
              </motion.tr>
            ))}

            {/* outros serviços */}
            <tr className="bg-blue-50 hover:bg-blue-100 border-t-2 border-primary/20">
              <td className="px-6 py-4 font-bold text-blue-800 text-xl">
                Outros Serviços / Atendimentos
              </td>
              <td></td>
              <td className="px-6 py-4 text-right">
                <button
                  onClick={() => router.push(`/totem/${doctorId}/outros`)}
                  className="px-6 py-2 bg-blue-600 text-white text-lg font-bold rounded-lg shadow hover:bg-blue-700"
                >
                  Selecionar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* voltar */}
      <button
        onClick={() => router.push("/totem")}
        className="mt-6 text-lg text-gray-500 underline hover:text-gray-700"
      >
        ← Voltar
      </button>
    </main>
  );
}
