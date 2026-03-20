//src/components/agenda/AgendaProfessionalColumn.tsx
import { AlertTriangle, Stethoscope } from "lucide-react";
import type { AgendaProfessionalColumn as AgendaProfessionalColumnType } from "@/modules/agenda/Agenda.types";
import { AgendaAppointmentCard } from "./AgendaAppointmentCard";

type Props = {
  column: AgendaProfessionalColumnType;
};

function getColumnTone(total: number, pending: number, conflicts: number) {
  if (conflicts > 0) {
    return "border-rose-300 bg-rose-50/30 dark:border-rose-900/40 dark:bg-rose-950/10";
  }

  if (total === 0) {
    return "border-dashed";
  }

  if (pending >= 3) {
    return "border-amber-200/80 bg-amber-50/20 dark:border-amber-900/40 dark:bg-amber-950/10";
  }

  return "border-border bg-card";
}

export function AgendaProfessionalColumn({ column }: Props) {
  const conflictCount = column.appointments.filter(
    (item) => item.hasConflict,
  ).length;
  const tone = getColumnTone(
    column.totalAppointments,
    column.pending,
    conflictCount,
  );

  return (
    <div className={`flex min-w-[300px] flex-col rounded-2xl border ${tone}`}>
      <div className="border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">{column.professionalName}</h3>
          </div>

          {conflictCount > 0 ? (
            <div className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-100 px-2 py-1 text-[11px] text-rose-700">
              <AlertTriangle className="h-3 w-3" />
              Conflito
            </div>
          ) : column.pending >= 3 ? (
            <div className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2 py-1 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              <AlertTriangle className="h-3 w-3" />
              Atenção
            </div>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div className="rounded-xl border bg-background/70 p-2">
            <p>Total</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {column.totalAppointments}
            </p>
          </div>

          <div className="rounded-xl border bg-background/70 p-2">
            <p>Confirmados</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {column.confirmed}
            </p>
          </div>

          <div className="rounded-xl border bg-background/70 p-2">
            <p>Pendentes</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {column.pending}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 p-4">
        {column.appointments.length === 0 ? (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Nenhum atendimento neste dia.
          </div>
        ) : (
          column.appointments.map((item) => (
            <AgendaAppointmentCard key={item.id} item={item} />
          ))
        )}
      </div>
    </div>
  );
}
