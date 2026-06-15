//src/app/admin/page.tsx
import {
  Activity,
  ArrowUpRight,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MessageCircleMore,
  RotateCcw,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { formatDateTime } from "@/lib/time";

import { AutomationStatusCard } from "@/components/dashboard/AutomationStatusCard";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";
import { MessagingStatusCard } from "@/components/dashboard/MessagingStatusCard";
import { QuickActionsCard } from "@/components/dashboard/QuickActionsCard";
import { UpcomingAppointmentsCard } from "@/components/dashboard/UpcomingAppointmentsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function getOperationalTone(input: {
  pending: number;
  cancelled: number;
  failedAutomations: number;
  failedMessages: number;
}) {
  const attentionPoints =
    (input.pending > 0 ? 1 : 0) +
    (input.cancelled > 0 ? 1 : 0) +
    (input.failedAutomations > 0 ? 1 : 0) +
    (input.failedMessages > 0 ? 1 : 0);

  if (attentionPoints === 0) {
    return {
      label: "Operação saudável",
      description:
        "Agenda, comunicação e automações seguem sem sinais imediatos de risco.",
      classes: "border-emerald-200 bg-emerald-50 text-emerald-900",
    };
  }

  if (attentionPoints <= 2) {
    return {
      label: "Operação em atenção",
      description:
        "Existem pontos que merecem acompanhamento para manter previsibilidade na rotina.",
      classes: "border-amber-200 bg-amber-50 text-amber-900",
    };
  }

  return {
    label: "Operação exige atenção",
    description:
      "Há sinais operacionais que podem impactar fluxo, comunicação ou consistência do atendimento.",
    classes: "border-rose-200 bg-rose-50 text-rose-900",
  };
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

  const operationalTone = getOperationalTone({
    pending: dashboard.today.pending,
    cancelled: dashboard.today.cancelled,
    failedAutomations: dashboard.automations.failed,
    failedMessages: dashboard.messaging.failedToday,
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="space-y-6 p-4 sm:p-6">
        <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-white via-slate-50 to-slate-100" />

          <div className="relative flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                <Building2 className="h-3.5 w-3.5" />
                <span>{company.name}</span>
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  {getDayGreeting()}, visão operacional
                </h1>
                <p className="max-w-2xl text-sm text-slate-600 sm:text-base">
                  Acompanhe atendimentos, confirmações, comunicação e automações
                  em um só lugar, com uma leitura mais clara do que merece ação
                  agora.
                </p>
              </div>

              <div
                className={`inline-flex max-w-2xl rounded-2xl border px-4 py-3 text-sm ${operationalTone.classes}`}
              >
                <div>
                  <p className="font-semibold">{operationalTone.label}</p>
                  <p className="mt-1 opacity-80">
                    {operationalTone.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Data
                </p>
                <p className="mt-1 font-medium text-slate-900">
                  {getCurrentDateLabel()}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Empresa ativa
                </p>
                <p className="mt-1 font-medium text-slate-900">
                  Operação vinculada
                </p>
              </div>
            </div>
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

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-2xl border-slate-200 shadow-sm lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <TrendingUp className="h-5 w-5 text-slate-500" />
                Leitura rápida da operação
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Concluídos</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {dashboard.today.completed}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Finalizados hoje
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Reagendados</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {dashboard.today.rescheduled}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Mudanças no fluxo
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Mensagens com falha</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {dashboard.messaging.failedToday}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Exigem acompanhamento
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <ArrowUpRight className="h-5 w-5 text-slate-500" />
                Prioridade do momento
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">
                  Pendências operacionais
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {dashboard.today.pending > 0
                    ? `Existem ${dashboard.today.pending} atendimento(s) pendente(s) que merecem consolidação.`
                    : "Não há pendências relevantes de confirmação neste momento."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-900">
                  Continuidade
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {dashboard.automations.pending > 0
                    ? `Há ${dashboard.automations.pending} automação(ões) pendente(s) sustentando a jornada.`
                    : "Não há automações pendentes neste momento."}
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <UpcomingAppointmentsCard items={dashboard.upcoming} />
          <QuickActionsCard />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <MessagingStatusCard
            receivedToday={dashboard.messaging.receivedToday}
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

        <section className="grid gap-6 xl:grid-cols-3">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Activity className="h-5 w-5 text-slate-500" />
                Saúde da agenda
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Agenda</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {dashboard.health.agendaHealthy
                    ? "Operando normalmente"
                    : "Exige verificação"}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Visão do fluxo de atendimentos e estabilidade operacional.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <MessageCircleMore className="h-5 w-5 text-slate-500" />
                Saúde da mensageria
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Mensageria</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {dashboard.health.messagingHealthy
                    ? "Saudável"
                    : "Com falhas"}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Indicador de consistência das comunicações enviadas no dia.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Bot className="h-5 w-5 text-slate-500" />
                Saúde das automações
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Automações</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {dashboard.health.automationsHealthy
                    ? "Saudáveis"
                    : "Exigem atenção"}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Leitura da continuidade operacional prevista para a jornada.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
              Centro de controle do dia
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Volume do dia</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {dashboard.today.total}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                atendimentos hoje · {dashboard.week.total} na semana
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Confirmação</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {dashboard.today.confirmed}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                atendimentos consolidados
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Clientes</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {dashboard.clients.total}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {dashboard.clients.newToday} novo(s) hoje ·{" "}
                {dashboard.clients.newThisWeek} na semana
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Comunicação</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {dashboard.messaging.receivedToday}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                mensagens recebidas hoje · {dashboard.messaging.sentToday}{" "}
                enviadas
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Automações</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {dashboard.automations.pending}
              </p>
              <p className="mt-1 text-sm text-slate-500">execuções pendentes</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-slate-500" />
                Últimos clientes
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {dashboard.clients.recent.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Nenhum cliente cadastrado recentemente.
                  </p>
                ) : (
                  dashboard.clients.recent.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          {client.name}
                        </p>

                        <p className="text-sm text-slate-500">
                          {client.phoneE164}
                        </p>
                      </div>

                      <div className="text-right text-xs text-slate-500">
                        {client.createdAt
                          ? formatDateTime(client.createdAt)
                          : "-"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircleMore className="h-5 w-5 text-slate-500" />
                Últimas mensagens
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {dashboard.messaging.recent.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Nenhuma mensagem registrada.
                  </p>
                ) : (
                  dashboard.messaging.recent.map((message) => (
                    <div
                      key={message.id}
                      className="rounded-xl border border-slate-200 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium uppercase text-slate-500">
                          {message.status}
                        </span>

                        <span className="text-xs text-slate-500">
                          {message.createdAt
                            ? formatDateTime(message.createdAt)
                            : "-"}
                        </span>
                      </div>

                      <p className="line-clamp-2 text-sm text-slate-700">
                        {message.body}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
