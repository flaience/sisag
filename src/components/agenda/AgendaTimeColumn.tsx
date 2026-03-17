import { AlertTriangle } from "lucide-react";
import type {
  AgendaProfessionalColumn,
  AgendaTimePositionedAppointment,
  AgendaTimeSlot,
} from "@/modules/agenda/Agenda.types";
import { AgendaTimeCard } from "./AgendaTimeCard";

type Props = {
  column: AgendaProfessionalColumn;
  slots: AgendaTimeSlot[];
  slotHeight: number;
};

function getMinutesOfDay(iso: string) {
  const date = new Date(iso);
  return date.getHours() * 60 + date.getMinutes();
}

function intervalsOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
) {
  return startA < endB && startB < endA;
}

function positionAppointments(
  appointments: AgendaProfessionalColumn["appointments"],
  slots: AgendaTimeSlot[],
  slotHeight: number,
): AgendaTimePositionedAppointment[] {
  if (slots.length === 0) return [];

  const baseMinutes = slots[0].minutesOfDay;
  const pxPerMinute = slotHeight / 30;

  const positionedBase = appointments.map((item) => {
    const startMinutes = getMinutesOfDay(item.scheduledTime);
    const endMinutes = getMinutesOfDay(item.endTime);

    const top = Math.max(0, (startMinutes - baseMinutes) * pxPerMinute);

    const realDuration = Math.max(15, endMinutes - startMinutes);
    const height = realDuration * pxPerMinute;

    return {
      ...item,
      minutesOfDay: startMinutes,
      top,
      height,
      hasConflict: false,
    };
  });

  for (let i = 0; i < positionedBase.length; i++) {
    const current = positionedBase[i];
    const currentStart = getMinutesOfDay(current.scheduledTime);
    const currentEnd = getMinutesOfDay(current.endTime);

    for (let j = i + 1; j < positionedBase.length; j++) {
      const other = positionedBase[j];
      const otherStart = getMinutesOfDay(other.scheduledTime);
      const otherEnd = getMinutesOfDay(other.endTime);

      if (intervalsOverlap(currentStart, currentEnd, otherStart, otherEnd)) {
        current.hasConflict = true;
        other.hasConflict = true;
      }
    }
  }

  return positionedBase;
}

export function AgendaTimeColumn({ column, slots, slotHeight }: Props) {
  const positioned = positionAppointments(
    column.appointments,
    slots,
    slotHeight,
  );
  const gridHeight = slots.length * slotHeight;
  const conflictCount = positioned.filter((item) => item.hasConflict).length;

  return (
    <div className="min-w-[280px] flex-1">
      <div className="mb-2 rounded-2xl border bg-card p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{column.professionalName}</p>

            <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
              <span>{column.totalAppointments} total</span>
              <span>•</span>
              <span>{column.confirmed} confirmados</span>
              <span>•</span>
              <span>{column.pending} pendentes</span>
            </div>
          </div>

          {conflictCount > 0 ? (
            <div className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-100 px-2 py-1 text-[11px] text-rose-700">
              <AlertTriangle className="h-3 w-3" />
              {conflictCount} conflito{conflictCount > 1 ? "s" : ""}
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={`relative rounded-2xl border bg-card ${
          conflictCount > 0
            ? "border-rose-300 shadow-[0_0_0_1px_rgba(244,63,94,0.15)]"
            : ""
        }`}
        style={{ height: `${gridHeight}px` }}
      >
        {slots.map((slot) => (
          <div
            key={`${column.professionalId}-${slot.label}`}
            className="border-t first:border-t-0"
            style={{ height: `${slotHeight}px` }}
          />
        ))}

        {positioned.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Sem atendimentos
          </div>
        ) : (
          positioned.map((item) => <AgendaTimeCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}
