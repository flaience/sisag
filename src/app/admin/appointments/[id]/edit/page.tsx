// src/app/admin/appointments/[id]/edit/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { ScheduleSlotPicker } from "@/components/ScheduleSlotPicker";

export default function AppointmentEditPage({ params }: any) {
  const router = useRouter();

  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ---------- ESTADOS DO MODAL DE REAGENDAMENTO ----------
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [date, setDate] = useState(""); // <--- ESSENCIAL
  const [selectedSlot, setSelectedSlot] = useState(""); // <--- ESSENCIAL
  const [loadingReschedule, setLoadingReschedule] = useState(false);

  // ---------- CARREGAR AGENDAMENTO ----------
  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/v1/appointments/${params.id}`);
      const data = await res.json();
      setForm(data);
      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) return <div>Carregando...</div>;
  if (!form) return <div>Agendamento não encontrado</div>;

  // ---------- CANCELAMENTO SEGURO ----------
  async function handleCancel() {
    if (!confirm("Deseja cancelar este agendamento com segurança?")) return;

    const res = await fetch(`/api/v1/appointments/${params.id}/cancel`, {
      method: "POST",
    });

    if (!res.ok) {
      const err = await res.json();
      alert("Erro ao cancelar: " + (err.message ?? err.error));
      return;
    }

    alert("Cancelado com sucesso!");
    router.push("/admin/appointments");
  }

  // ---------- CONFIRMAR REAGENDAMENTO ----------
  async function handleRescheduleConfirm() {
    if (!date || !selectedSlot) {
      alert("Selecione a data e o horário.");
      return;
    }

    setLoadingReschedule(true);

    const fullDateTime = `${date}T${selectedSlot}:00`;

    const res = await fetch(`/api/v1/appointments/${params.id}/reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledTime: fullDateTime }),
    });

    setLoadingReschedule(false);

    if (!res.ok) {
      const err = await res.json();
      alert("Erro ao reagendar: " + (err.message ?? err.error));
      return;
    }

    alert("Reagendado com sucesso!");
    setRescheduleOpen(false);
    router.push("/admin/appointments");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Editar Agendamento</h1>

      <div className="bg-white shadow rounded p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium">Cliente</label>
          <input
            disabled
            className="border rounded w-full p-2 mt-1 bg-gray-100"
            value={form.clientName ?? ""}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Profissional</label>
          <input
            disabled
            className="border rounded w-full p-2 mt-1 bg-gray-100"
            value={form.professionalName ?? ""}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Horário atual</label>
          <input
            disabled
            className="border rounded w-full p-2 mt-1 bg-gray-100"
            value={new Date(form.scheduledTime).toLocaleString()}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <button
            onClick={() => setRescheduleOpen(true)}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Reagendar
          </button>

          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-red-600 text-white rounded"
          >
            Cancelar
          </button>

          <button
            onClick={() => router.push("/admin/appointments")}
            className="px-4 py-2 bg-gray-300 rounded"
          >
            Voltar
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* ---------------------- MODAL DE REAGENDAMENTO --------------------- */}
      {/* ------------------------------------------------------------------ */}

      <Modal
        open={rescheduleOpen}
        onClose={() => {
          setRescheduleOpen(false);
          setSelectedSlot("");
          setDate("");
        }}
        title="Reagendar Atendimento"
      >
        <div className="space-y-4">
          {/* DATA */}
          <div>
            <label className="block text-sm font-medium mb-1">Nova Data</label>
            <input
              type="date"
              className="border p-2 rounded w-full"
              min={new Date().toISOString().substring(0, 10)}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setSelectedSlot("");
              }}
            />
          </div>

          {/* SLOT PICKER */}
          <ScheduleSlotPicker
            professionalId={form.professionalId}
            date={date}
            onSelect={(slot) => setSelectedSlot(slot)}
          />

          {/* FEEDBACK DO SLOT SELECIONADO */}
          {selectedSlot && (
            <div className="text-green-700 font-semibold pt-2">
              Horário selecionado: {selectedSlot}
            </div>
          )}

          {/* BOTÕES */}
          <div className="flex justify-end gap-2 pt-4">
            <button
              className="px-4 py-2 bg-gray-200 rounded"
              onClick={() => {
                setRescheduleOpen(false);
                setSelectedSlot("");
                setDate("");
              }}
            >
              Fechar
            </button>

            <button
              onClick={handleRescheduleConfirm}
              disabled={!selectedSlot || !date || loadingReschedule}
              className="
          px-4 py-2 rounded text-white
          disabled:opacity-50
          bg-blue-600
        "
            >
              {loadingReschedule ? "Reagendando..." : "Confirmar"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
