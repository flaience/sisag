"use client";

import { Modal } from "@/components/Modal";
import { ScheduleSlotPicker } from "@/components/ScheduleSlotPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  companyId: string;
  serviceId?: string | null;
  professionalId?: string | null;
  durationMinutes: number;
  date: string;
  slot: string;
  reason: string;
  onDateChange: (value: string) => void;
  onSlotChange: (value: string) => void;
  onReasonChange: (value: string) => void;
};

export function JourneyRescheduleModal({
  open,
  onClose,
  onConfirm,
  loading,
  companyId,
  serviceId,
  professionalId,

  date,
  slot,
  reason,
  onDateChange,
  onSlotChange,
  onReasonChange,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Reagendar booking">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Selecione uma nova data e horário para o atendimento.
        </p>

        <div className="space-y-2">
          <Label htmlFor="reschedule-date">Nova data</Label>
          <Input
            id="reschedule-date"
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Novo horário</Label>

          {professionalId ? (
            <ScheduleSlotPicker
              professionalId={professionalId}
              companyId={companyId}
              serviceId={serviceId ?? undefined}
              durationMinutes={firstItem?.durationMinutes ?? 30}
              date={date}
              selectedSlot={slot}
              onSelect={onSlotChange}
              title="Horários para reagendamento"
              description="Selecione um novo horário disponível para este mesmo atendimento."
              emptyMessage="Não encontramos horários disponíveis para reagendar nesta data. Tente outro dia."
            />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500">
              Profissional não disponível para calcular horários.
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reschedule-reason">Motivo</Label>
          <Input
            id="reschedule-reason"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Opcional"
          />
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading || !date || !slot || !professionalId}
          >
            {loading ? "Reagendando..." : "Confirmar reagendamento"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
