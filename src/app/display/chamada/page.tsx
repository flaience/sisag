"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import doctors from "@/data/mockDoctors.json";
import appointments from "@/data/mockAppointments.json";

interface Appointment {
  id: string;
  patient: string;
  doctorId: string;
  time: string;
  status: string;
}

interface Doctor {
  id: string;
  name: string;
  title: string;
  photo: string;
}

export default function DisplayChamada() {
  const [currentCalls, setCurrentCalls] = useState<
    { patient: string; doctor: Doctor; time: string }[]
  >([]);

  const [message, setMessage] = useState<string>(
    "Bem-vindo à Clínica Odonto Serra"
  );

  // Simula chamadas a cada 15 segundos
  useEffect(() => {
    const makeCall = () => {
      const randomDoctor = doctors[Math.floor(Math.random() * doctors.length)];
      const doctorAppointments = appointments.filter(
        (a) => a.doctorId === randomDoctor.id
      );
      const randomAppointment =
        doctorAppointments[
          Math.floor(Math.random() * doctorAppointments.length)
        ];

      const newCall = {
        patient: randomAppointment.patient,
        doctor: randomDoctor,
        time: new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setCurrentCalls((prev) => [newCall, ...prev.slice(0, 4)]);

      // Alterna mensagens simuladas
      const messages = [
        "Por favor, mantenha o silêncio na sala de espera.",
        "Obrigado por escolher a Odonto Serra!",
        `${randomDoctor.name} está atendendo no momento.`,
        "Sinta-se à vontade para usar o Wi-Fi da clínica.",
      ];
      setMessage(messages[Math.floor(Math.random() * messages.length)]);
    };

    makeCall(); // primeira chamada
    const interval = setInterval(makeCall, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Cabeçalho */}
      <header className="bg-primary py-4 text-center text-3xl font-bold tracking-wide">
        Painel de Chamada — Odonto Serra
      </header>

      {/* Mensagem dinâmica */}
      <div className="bg-gray-800 py-3 text-lg text-center text-gray-300 border-b border-gray-700">
        {message}
      </div>

      {/* Lista de chamadas */}
      <section className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-5xl">
          {currentCalls.length === 0 ? (
            <p className="text-gray-400 text-xl text-center mt-10">
              Nenhuma chamada no momento.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {currentCalls.map((call, index) => (
                <motion.div
                  key={`${call.patient}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.2 }}
                  className="bg-white/10 rounded-2xl p-6 border border-white/20 shadow-lg backdrop-blur-sm"
                >
                  <h2 className="text-2xl font-semibold text-white">
                    {call.patient}
                  </h2>
                  <p className="text-gray-300 mt-1 text-lg">
                    com {call.doctor.name}
                  </p>
                  <p className="text-gray-400 mt-2 text-sm">{call.time}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Rodapé */}
      <footer className="bg-gray-800 text-gray-400 py-2 text-sm text-center border-t border-gray-700">
        Atualização automática a cada 15 segundos — Modo demonstração
      </footer>
    </main>
  );
}
