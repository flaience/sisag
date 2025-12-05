"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

import { useParams } from "next/navigation";

interface Appointment {
  id: string;
  patientName: string;
  time: string;
  status: string;
}

export default function PainelProfissional() {
  const params = useParams();
  const doctorId = params?.doctorId as string;
  const [data, setData] = useState<Appointment[]>([]);
  const supabase = supabaseClient();

  // Busca inicial
  async function fetchAppointments() {
    const res = await fetch(`/api/atendimentos?doctorId=${doctorId}`);
    const json = await res.json();
    setData(json);
  }

  // Atualiza um agendamento específico
  function updateAppointmentStatus(id: string, status: string) {
    setData((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  useEffect(() => {
    fetchAppointments();

    // Listener realtime
    const channel = supabase
      .channel("appointments")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "flaience",
          table: "appointments",
          filter: `doctor_id=eq.${doctorId}`,
        },
        (payload) => {
          const id = payload.new.id;
          const status = payload.new.status;
          updateAppointmentStatus(id, status);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorId]);

  return (
    <main className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
      <h1 className="text-3xl font-bold text-primary mb-6">
        Painel de Atendimentos
      </h1>

      <table className="w-full max-w-4xl bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <thead className="bg-primary text-white text-lg">
          <tr>
            <th className="px-6 py-4 text-left">Paciente</th>
            <th className="px-6 py-4 text-left">Horário</th>
            <th className="px-6 py-4 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((apt) => (
            <tr
              key={apt.id}
              className={`border-b border-gray-100 ${
                apt.status === "CHECKED_IN"
                  ? "bg-green-50"
                  : apt.status === "PENDING"
                  ? ""
                  : "bg-red-50"
              }`}
            >
              <td className="px-6 py-4 text-lg font-semibold text-gray-800">
                {apt.patientName}
              </td>
              <td className="px-6 py-4 text-lg text-gray-700">
                {new Date(apt.time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="px-6 py-4 text-lg font-medium">
                {apt.status === "CHECKED_IN"
                  ? "🟢 Confirmado"
                  : apt.status === "PENDING"
                  ? "⚪ Aguardando"
                  : "🔴 Ausente"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
