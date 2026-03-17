import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
} from "lucide-react";

type Props = {
  dateIso: string;
};

function formatDateLabel(dateIso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateIso}T12:00:00`));
}

function shiftDate(dateIso: string, days: number) {
  const date = new Date(`${dateIso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function AgendaDayHeader({ dateIso }: Props) {
  const prevDate = shiftDate(dateIso, -1);
  const nextDate = shiftDate(dateIso, 1);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>Agenda operacional</span>
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {formatDateLabel(dateIso)}
          </h1>
          <p className="text-sm text-muted-foreground">
            Visualize o dia, acompanhe pendências e aja rapidamente.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/admin/agenda?date=${prevDate}`}
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-muted/40"
        >
          <ChevronLeft className="h-4 w-4" />
          Dia anterior
        </Link>

        <Link
          href={`/admin/agenda?date=${nextDate}`}
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-muted/40"
        >
          Próximo dia
          <ChevronRight className="h-4 w-4" />
        </Link>

        <Link
          href="/admin/appointments/new"
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-muted/40"
        >
          <PlusCircle className="h-4 w-4" />
          Novo atendimento
        </Link>
      </div>
    </div>
  );
}
