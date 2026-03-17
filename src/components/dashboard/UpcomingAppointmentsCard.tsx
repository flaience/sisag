import Link from "next/link";
import { CalendarDays, Clock3, Stethoscope, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DashboardSection } from "./DashboardSection";
import type { DashboardUpcomingItem } from "@/modules/dashboard/Dashboard.types";

type Props = {
  items: DashboardUpcomingItem[];
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

export function UpcomingAppointmentsCard({ items }: Props) {
  return (
    <DashboardSection
      title="Próximos atendimentos"
      description="Visão rápida da sequência do dia"
      icon={<CalendarDays className="h-4 w-4" />}
    >
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            Nenhum atendimento próximo encontrado para hoje.
          </div>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={`/admin/appointments/${item.id}/edit`}
              className="block rounded-xl border p-4 transition hover:bg-muted/40"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock3 className="h-4 w-4" />
                    <span>{item.timeLabel}</span>
                  </div>

                  <div className="flex items-center gap-2 font-medium">
                    <UserRound className="h-4 w-4" />
                    <span>{item.clientName}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Stethoscope className="h-4 w-4" />
                    <span>
                      {item.professionalName ?? "Profissional não definido"}
                    </span>
                  </div>
                </div>

                <Badge variant="secondary">{getStatusLabel(item.status)}</Badge>
              </div>
            </Link>
          ))
        )}
      </div>
    </DashboardSection>
  );
}
