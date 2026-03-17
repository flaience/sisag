import Link from "next/link";
import { AlertTriangle, Clock3, UserRound, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AgendaTimePositionedAppointment } from "@/modules/agenda/Agenda.types";

type Props = {
  item: AgendaTimePositionedAppointment;
};

function getStatusLabel(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "Confirmado";
    case "PENDING":
      return "Pendente";
    case "CANCELLED":
      return "Cancelado";
    case "COMPLETED":
      return "Concluído";
    case "RESCHEDULED":
      return "Reagendado";
    default:
      return status;
  }
}

function getStatusStyles(status: string, hasConflict: boolean) {
  if (hasConflict) {
    return "border-rose-300 bg-rose-100 text-rose-950 ring-2 ring-rose-300/60";
  }

  switch (status) {
    case "CONFIRMED":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "CANCELLED":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "COMPLETED":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "RESCHEDULED":
      return "border-violet-200 bg-violet-50 text-violet-900";
    default:
      return "border-border bg-background text-foreground";
  }
}

export function AgendaTimeCard({ item }: Props) {
  return (
    <Link
      href={`/admin/appointments/${item.id}/edit`}
      className={`absolute left-2 right-2 rounded-xl border p-3 shadow-sm transition hover:shadow-md ${getStatusStyles(item.status, item.hasConflict)}`}
      style={{
        top: `${item.top}px`,
        height: `${item.height}px`,
      }}
    >
      <div className="flex h-full flex-col justify-between gap-2 overflow-hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs opacity-80">
            <Clock3 className="h-3.5 w-3.5" />
            <span>
              {item.timeLabel} • {item.durationMinutes} min
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm font-medium">
            <UserRound className="h-3.5 w-3.5" />
            <span className="line-clamp-1">{item.clientName}</span>
          </div>

          {item.serviceNameSnapshot ? (
            <div className="flex items-center gap-2 text-xs opacity-80">
              <Wrench className="h-3.5 w-3.5" />
              <span className="line-clamp-1">{item.serviceNameSnapshot}</span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {item.hasConflict ? (
            <Badge
              variant="outline"
              className="border-rose-300 bg-white/80 text-[11px] text-rose-700"
            >
              <AlertTriangle className="mr-1 h-3 w-3" />
              Conflito
            </Badge>
          ) : null}

          <Badge variant="outline" className="bg-white/70 text-[11px]">
            {getStatusLabel(item.status)}
          </Badge>
        </div>
      </div>
    </Link>
  );
}
