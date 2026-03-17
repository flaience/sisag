import {
  Activity,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { redirect } from "next/navigation";

import { AutomationStatusCard } from "@/components/dashboard/AutomationStatusCard";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";
import { MessagingStatusCard } from "@/components/dashboard/MessagingStatusCard";
import { QuickActionsCard } from "@/components/dashboard/QuickActionsCard";
import { UpcomingAppointmentsCard } from "@/components/dashboard/UpcomingAppointmentsCard";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getCurrentCompany } from "@/modules/dashboard/getCurrentCompany";
import { DashboardService } from "@/modules/dashboard/Dashboard.service";

function getDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function getCurrentDateLabel() {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date());
}

export default async function AdminDashboardPage() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const company = await getCurrentCompany();

  if (!company) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Dashboard do SISAG
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Usuário autenticado, mas sem empresa vinculada.
          </p>
        </header>

        <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
          Verifique o vínculo do usuário em <code>profiles.companyId</code>.
        </div>
      </div>
    );
  }

  const dashboard = await DashboardService.getAdminDashboard(company.id);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            <span>{company.name}</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {getDayGreeting()}, visão operacional
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Acompanhe atendimentos, comunicação e automações em um só lugar.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border px-4 py-3 text-sm text-muted-foreground">
          {getCurrentDateLabel()}
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          title="Atendimentos hoje"
          value={dashboard.today.total}
          hint="Total previsto para o dia"
          icon={<CalendarDays className="h-5 w-5" />}
        />

        <DashboardStatCard
          title="Confirmados"
          value={dashboard.today.confirmed}
          hint="Prontos para atendimento"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />

        <DashboardStatCard
          title="Pendentes"
          value={dashboard.today.pending}
          hint="Precisam de atenção"
          icon={<Clock3 className="h-5 w-5" />}
        />

        <DashboardStatCard
          title="Cancelados"
          value={dashboard.today.cancelled}
          hint="Impacto no dia"
          icon={<XCircle className="h-5 w-5" />}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        <DashboardStatCard
          title="Concluídos"
          value={dashboard.today.completed}
          hint="Finalizados hoje"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />

        <DashboardStatCard
          title="Reagendados"
          value={dashboard.today.rescheduled}
          hint="Mudanças na agenda"
          icon={<RotateCcw className="h-5 w-5" />}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <UpcomingAppointmentsCard items={dashboard.upcoming} />
        <QuickActionsCard />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <MessagingStatusCard
          sentToday={dashboard.messaging.sentToday}
          deliveredToday={dashboard.messaging.deliveredToday}
          readToday={dashboard.messaging.readToday}
          failedToday={dashboard.messaging.failedToday}
          lastMessageAt={dashboard.messaging.lastMessageAt}
        />

        <AutomationStatusCard
          pending={dashboard.automations.pending}
          completedToday={dashboard.automations.completedToday}
          failed={dashboard.automations.failed}
          nextRunAt={dashboard.automations.nextRunAt}
        />
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold sm:text-lg">
            Saúde operacional
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Agenda</p>
            <p className="mt-2 text-lg font-semibold">
              {dashboard.health.agendaHealthy
                ? "Operando normalmente"
                : "Verificar"}
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Mensageria</p>
            <p className="mt-2 text-lg font-semibold">
              {dashboard.health.messagingHealthy ? "Saudável" : "Com falhas"}
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Automações</p>
            <p className="mt-2 text-lg font-semibold">
              {dashboard.health.automationsHealthy
                ? "Saudáveis"
                : "Exigem atenção"}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
