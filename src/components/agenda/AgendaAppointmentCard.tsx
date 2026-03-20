//src/components/agenda/AgendaAppointmentCard.tsx
import Link from "next/link";
import { Clock3, Stethoscope, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AgendaAppointmentItem } from "@/modules/agenda/Agenda.types";

type Props = {
  item: AgendaAppointmentItem;
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

function getStatusDescription(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "Atendimento pronto para acontecer.";
    case "PENDING":
      return "Requer acompanhamento ou confirmação.";
    case "CANCELLED":
      return "Compromisso cancelado.";
    case "COMPLETED":
      return "Atendimento finalizado.";
    case "RESCHEDULED":
      return "Horário alterado recentemente.";
    default:
      return "Status operacional do atendimento.";
  }
}

function getStatusStyles(status: string) {
  switch (status) {
    case "CONFIRMED":
      return {
        card: "border-emerald-200/80 bg-emerald-50/40 hover:bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20",
        badge:
          "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
        stripe: "bg-emerald-500",
      };
    case "PENDING":
      return {
        card: "border-amber-200/80 bg-amber-50/40 hover:bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20",
        badge:
          "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
        stripe: "bg-amber-500",
      };
    case "CANCELLED":
      return {
        card: "border-rose-200/80 bg-rose-50/40 hover:bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/20",
        badge:
          "border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300",
        stripe: "bg-rose-500",
      };
    case "COMPLETED":
      return {
        card: "border-sky-200/80 bg-sky-50/40 hover:bg-sky-50/60 dark:border-sky-900/50 dark:bg-sky-950/20",
        badge:
          "border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
        stripe: "bg-sky-500",
      };
    case "RESCHEDULED":
      return {
        card: "border-violet-200/80 bg-violet-50/40 hover:bg-violet-50/60 dark:border-violet-900/50 dark:bg-violet-950/20",
        badge:
          "border-violet-200 bg-violet-100 text-violet-800 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300",
        stripe: "bg-violet-500",
      };
    default:
      return {
        card: "border-border bg-background hover:bg-muted/40",
        badge: "border-border bg-muted text-foreground",
        stripe: "bg-muted-foreground",
      };
  }
}

export function AgendaAppointmentCard({ item }: Props) {
  const styles = getStatusStyles(item.status);

  return (
    <Link
      href={`/admin/appointments/${item.id}/edit`}
      className={[
        "relative block overflow-hidden rounded-2xl border p-4 transition",
        styles.card,
      ].join(" ")}
    >
      <div className={`absolute left-0 top-0 h-full w-1.5 ${styles.stripe}`} />

      <div className="flex flex-col gap-3 pl-2 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3 className="h-4 w-4" />
            <span>{item.timeLabel}</span>
          </div>

          <div className="flex items-center gap-2 font-medium text-foreground">
            <UserRound className="h-4 w-4" />
            <span>{item.clientName}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Stethoscope className="h-4 w-4" />
            <span>{item.professionalName ?? "Profissional não definido"}</span>
          </div>

          <p className="text-xs text-muted-foreground">
            {getStatusDescription(item.status)}
          </p>
        </div>

        <Badge variant="outline" className={styles.badge}>
          {getStatusLabel(item.status)}
        </Badge>
      </div>
    </Link>
  );
}
