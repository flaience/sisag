"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import doctors from "@/data/mockDoctors.json";
import appointments from "@/data/mockAppointments.json";
import visitors from "@/data/mockVisits.json";

type Status = "SCHEDULED" | "CHECKED_IN" | "DELAYED" | "NO_SHOW";

interface UnifiedRecord {
  id: string;
  type: "PACIENTE" | "VISITANTE";
  name: string;
  professional?: string;
  time: string;
  status?: Status;
  labelColor: string;
}

export default function PainelAtendimentos() {
  const searchParams = useSearchParams();
  const doctorParam = searchParams.get("doctor");

  const [records, setRecords] = useState<UnifiedRecord[]>([]);
  const [doctorName, setDoctorName] = useState<string>(
    "Todos os profissionais"
  );

  // Prepara dados unificados
  useEffect(() => {
    // Filtra pacientes conforme médico
    const filteredAppointments = (appointments as any[])
      .filter((a) => !doctorParam || a.doctorId === doctorParam)
      .map((a) => {
        const doctor = doctors.find((d) => d.id === a.doctorId);
        return {
          id: a.id,
          type: "PACIENTE" as const,
          name: a.patient,
          professional: doctor?.name || "—",
          time: a.time,
          status: a.status as Status,
          labelColor:
            a.status === "CHECKED_IN"
              ? "bg-green-100 text-green-700"
              : a.status === "DELAYED"
              ? "bg-yellow-100 text-yellow-700"
              : a.status === "NO_SHOW"
              ? "bg-red-100 text-red-700"
              : "bg-gray-100 text-gray-700",
        };
      });

    // Mapeia visitantes
    const visitorData = (visitors as any[]).map((v) => ({
      id: v.id,
      type: "VISITANTE" as const,
      name: v.reason,
      professional: "—",
      time: new Date(v.timeIn).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      labelColor: "bg-blue-100 text-blue-700",
    }));

    const allRecords = [...filteredAppointments, ...visitorData];

    // Ordena por hora (pacientes primeiro)
    const ordered = allRecords.sort((a, b) => (a.time > b.time ? -1 : 1));
    setRecords(ordered);

    if (doctorParam) {
      const doctorObj = doctors.find((d) => d.id === doctorParam);
      setDoctorName(doctorObj?.name || "Profissional");
    }
  }, [doctorParam]);

  // Simula atualizações automáticas
  useEffect(() => {
    const interval = setInterval(() => {
      setRecords((prev) =>
        prev.map((r) =>
          r.type === "PACIENTE" &&
          r.status === "SCHEDULED" &&
          Math.random() > 0.7
            ? {
                ...r,
                status: "CHECKED_IN",
                labelColor: "bg-green-100 text-green-700",
              }
            : r
        )
      );
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-6 flex flex-col items-center">
      <h1 className="text-3xl font-bold text-primary mb-2">
        Painel de Atendimentos — {doctorName}
      </h1>
      <p className="text-gray-500 mb-8 text-sm">
        Atualização automática a cada 12 segundos (modo demonstração)
      </p>

      <div className="bg-white rounded-2xl shadow-md w-full max-w-6xl overflow-hidden border border-gray-100">
        <table className="w-full text-left border-collapse">
          <thead className="bg-primary text-white">
            <tr>
              <th className="px-6 py-3">Tipo</th>
              <th className="px-6 py-3">Identificação</th>
              <th className="px-6 py-3">Profissional</th>
              <th className="px-6 py-3">Horário</th>
              <th className="px-6 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-10 text-gray-500 text-lg"
                >
                  Nenhum atendimento no momento
                </td>
              </tr>
            ) : (
              records.map((r, index) => (
                <motion.tr
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-6 py-4">
                    {r.type === "PACIENTE" ? "👤 Paciente" : "👥 Visitante"}
                  </td>
                  <td className="px-6 py-4">{r.name}</td>
                  <td className="px-6 py-4">{r.professional}</td>
                  <td className="px-6 py-4">{r.time}</td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`px-4 py-1 rounded-full text-sm font-medium ${r.labelColor}`}
                    >
                      {r.type === "PACIENTE"
                        ? r.status === "CHECKED_IN"
                          ? "Confirmado"
                          : r.status === "NO_SHOW"
                          ? "Ausente"
                          : r.status === "DELAYED"
                          ? "Atrasado"
                          : "Agendado"
                        : "Em espera"}
                    </span>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
