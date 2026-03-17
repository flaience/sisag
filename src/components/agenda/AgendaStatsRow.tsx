import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Stethoscope,
  XCircle,
} from "lucide-react";
import type { AgendaDayStats } from "@/modules/agenda/Agenda.types";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";

type Props = {
  stats: AgendaDayStats;
};

export function AgendaStatsRow({ stats }: Props) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <DashboardStatCard
        title="Atendimentos"
        value={stats.total}
        hint="Total do dia"
        icon={<CalendarDays className="h-5 w-5" />}
      />
      <DashboardStatCard
        title="Confirmados"
        value={stats.confirmed}
        hint="Prontos para atendimento"
        icon={<CheckCircle2 className="h-5 w-5" />}
      />
      <DashboardStatCard
        title="Pendentes"
        value={stats.pending}
        hint="Precisam de atenção"
        icon={<Clock3 className="h-5 w-5" />}
      />
      <DashboardStatCard
        title="Cancelados"
        value={stats.cancelled}
        hint="Impacto no dia"
        icon={<XCircle className="h-5 w-5" />}
      />
      <DashboardStatCard
        title="Profissionais"
        value={stats.professionalsOnDay}
        hint="Com agenda hoje"
        icon={<Stethoscope className="h-5 w-5" />}
      />
    </section>
  );
}
