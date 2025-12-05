"use client";

import { useEffect, useState } from "react";
import {
  getSchedulingConfig,
  saveSchedulingConfig,
} from "@/services/scheduling-config.service";

export default function SchedulingConfigPage() {
  const [form, setForm] = useState({
    slotDurationMinutes: 15,
    bufferMinutes: 5,
    allowOverbooking: false,
    maxAdvanceDays: 30,
  });

  useEffect(() => {
    getSchedulingConfig().then((data) => {
      if (!data) return;
      setForm({
        slotDurationMinutes: data.slotDurationMinutes,
        bufferMinutes: data.bufferMinutes,
        allowOverbooking: data.allowOverbooking,
        maxAdvanceDays: data.maxAdvanceDays,
      });
    });
  }, []);

  function handleChange(e: any) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : Number(value),
    }));
  }

  async function handleSave() {
    await saveSchedulingConfig(form);
    alert("Configuração salva com sucesso!");
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Configuração de Agendamentos</h1>

      <div className="space-y-2">
        <label className="block">
          Duração padrão (minutos)
          <input
            type="number"
            name="slotDurationMinutes"
            value={form.slotDurationMinutes}
            onChange={handleChange}
            className="border p-2 w-full rounded"
          />
        </label>

        <label className="block">
          Intervalo entre consultas (buffer)
          <input
            type="number"
            name="bufferMinutes"
            value={form.bufferMinutes}
            onChange={handleChange}
            className="border p-2 w-full rounded"
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="allowOverbooking"
            checked={form.allowOverbooking}
            onChange={handleChange}
          />
          Permitir Overbooking?
        </label>

        <label className="block">
          Quantidade máxima de dias para agendamento futuro
          <input
            type="number"
            name="maxAdvanceDays"
            value={form.maxAdvanceDays}
            onChange={handleChange}
            className="border p-2 w-full rounded"
          />
        </label>
      </div>

      <button
        onClick={handleSave}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Salvar Configurações
      </button>
    </div>
  );
}
