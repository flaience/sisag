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
  BriefcaseBusiness,
  CalendarPlus,
  Settings,
  UserRound,
  Users,
  AlertTriangle,
  MessageSquareWarning,
  Sparkles,
  MessageSquare,
  UserPlus,
} from "lucide-react";
import {
  SisagMetricCard,
  SisagOperationalStatus,
  SisagPriorityCard,
  SisagQuickAccessCard,
  SisagSection,
  SisagStatusBadge,
  SisagTimeline,
} from "@/components/sisag";
import { redirect } from "next/navigation";

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

  const recentActivityItems = [
    ...dashboard.clients.recent.map((client) => ({
      id: `client-${client.id}`,
      title: client.name,
      description: client.phoneE164,
      meta: client.createdAt ? formatDateTime(client.createdAt) : null,
      sortDate: client.createdAt,
      icon: <UserPlus className="h-4 w-4" />,
    })),

    ...dashboard.messaging.recent.map((message) => {
      const statusTone =
        message.status === "failed"
          ? "critical"
          : message.status === "read" || message.status === "delivered"
            ? "success"
            : message.status === "sent"
              ? "info"
              : "neutral";

      return {
        id: `message-${message.id}`,
        title: (
          <div className="flex items-center gap-2">
            <span>Mensagem</span>
            <SisagStatusBadge label={message.status} tone={statusTone} />
          </div>
        ),
        description: message.body,
        meta: message.createdAt ? formatDateTime(message.createdAt) : null,
        sortDate: message.createdAt,
        icon: <MessageSquare className="h-4 w-4" />,
      };
    }),
  ].sort((a, b) => {
    const aTime = a.sortDate ? new Date(a.sortDate).getTime() : 0;
    const bTime = b.sortDate ? new Date(b.sortDate).getTime() : 0;

    return bTime - aTime;
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

        <SisagSection
          title="Acessos rápidos"
          description="Entre rapidamente nas principais áreas operacionais da plataforma."
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SisagQuickAccessCard
              title="Agenda"
              description="Visualize horários, atendimentos do dia e ocupação operacional."
              href="/admin/agenda"
              icon={<CalendarDays className="h-5 w-5" />}
              eyebrow="Operação"
            />

            <SisagQuickAccessCard
              title="Novo agendamento"
              description="Crie um novo atendimento de forma rápida e organizada."
              href="/admin/bookings/new"
              icon={<CalendarPlus className="h-5 w-5" />}
              eyebrow="Operação"
            />

            <SisagQuickAccessCard
              title="Agendamentos"
              description="Acompanhe histórico, status, cancelamentos e reagendamentos."
              href="/admin/bookings"
              icon={<BriefcaseBusiness className="h-5 w-5" />}
              eyebrow="Operação"
            />

            <SisagQuickAccessCard
              title="Clientes"
              description="Consulte e organize pessoas atendidas pela operação."
              href="/admin/people"
              icon={<Users className="h-5 w-5" />}
              eyebrow="Relacionamento"
            />

            <SisagQuickAccessCard
              title="Profissionais"
              description="Gerencie equipe, horários, disponibilidade e escalas."
              href="/admin/professionals"
              icon={<UserRound className="h-5 w-5" />}
              eyebrow="Equipe"
            />

            <SisagQuickAccessCard
              title="Configurações"
              description="Ajuste operação, usuários, WhatsApp e parâmetros da plataforma."
              href="/admin/settings"
              icon={<Settings className="h-5 w-5" />}
              eyebrow="Administração"
            />
          </div>
        </SisagSection>

        <SisagSection
          title="Central de prioridades"
          description="O que merece atenção agora para manter a operação fluindo."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <SisagPriorityCard
              title={
                dashboard.today.pending > 0
                  ? "Confirmações pendentes"
                  : "Agenda sem pendências críticas"
              }
              description={
                dashboard.today.pending > 0
                  ? `Existem ${dashboard.today.pending} atendimento(s) pendente(s) que precisam de acompanhamento.`
                  : "Nenhuma confirmação pendente exigindo ação imediata."
              }
              icon={<AlertTriangle className="h-5 w-5" />}
              tone={dashboard.today.pending > 0 ? "warning" : "success"}
              href="/admin/bookings"
              actionLabel="Ver agendamentos"
            />

            <SisagPriorityCard
              title={
                dashboard.messaging.failedToday > 0
                  ? "Falhas na comunicação"
                  : "Comunicação saudável"
              }
              description={
                dashboard.messaging.failedToday > 0
                  ? `${dashboard.messaging.failedToday} mensagem(ns) falharam hoje e precisam de verificação.`
                  : "Mensagens do dia seguem sem falhas críticas registradas."
              }
              icon={<MessageSquareWarning className="h-5 w-5" />}
              tone={
                dashboard.messaging.failedToday > 0 ? "critical" : "success"
              }
              href="/admin/settings/whatsapp/logs"
              actionLabel="Ver mensagens"
            />

            <SisagPriorityCard
              title="Próxima evolução"
              description="A Central de Prioridades será a base dos futuros agentes operacionais da plataforma."
              icon={<Sparkles className="h-5 w-5" />}
              tone="info"
              href="/admin"
              actionLabel="Entender visão"
            />
          </div>
        </SisagSection>

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

        <SisagSection
          title="Status operacional"
          description="Leitura consolidada da estabilidade da operação."
        >
          <div className="grid gap-6 xl:grid-cols-3">
            <SisagOperationalStatus
              title="Agenda"
              status={
                dashboard.health.agendaHealthy
                  ? "Operando normalmente"
                  : "Exige verificação"
              }
              description="Visão do fluxo de atendimentos e estabilidade da agenda."
              icon={<Activity className="h-5 w-5" />}
              tone={dashboard.health.agendaHealthy ? "stable" : "attention"}
            />

            <SisagOperationalStatus
              title="Comunicação"
              status={
                dashboard.health.messagingHealthy ? "Estável" : "Com falhas"
              }
              description="Indicador de consistência das comunicações enviadas no dia."
              icon={<MessageCircleMore className="h-5 w-5" />}
              tone={dashboard.health.messagingHealthy ? "stable" : "critical"}
            />

            <SisagOperationalStatus
              title="Automações"
              status={
                dashboard.health.automationsHealthy
                  ? "Estáveis"
                  : "Exigem atenção"
              }
              description="Leitura da continuidade operacional prevista para a jornada."
              icon={<Bot className="h-5 w-5" />}
              tone={
                dashboard.health.automationsHealthy ? "stable" : "attention"
              }
            />
          </div>
        </SisagSection>

        <SisagSection
          title="Cockpit operacional"
          description="Resumo consolidado da operação de hoje."
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SisagMetricCard
              title="Volume do dia"
              value={dashboard.today.total}
              description={`atendimentos hoje · ${dashboard.week.total} na semana`}
              icon={<Activity className="h-5 w-5" />}
              tone="info"
            />

            <SisagMetricCard
              title="Confirmação"
              value={dashboard.today.confirmed}
              description="atendimentos consolidados"
              icon={<CheckCircle2 className="h-5 w-5" />}
              tone="success"
            />

            <SisagMetricCard
              title="Clientes"
              value={dashboard.clients.total}
              description={`${dashboard.clients.newToday} novo(s) hoje · ${dashboard.clients.newThisWeek} na semana`}
              icon={<Users className="h-5 w-5" />}
              tone="neutral"
            />

            <SisagMetricCard
              title="Comunicação"
              value={dashboard.messaging.receivedToday}
              description={`mensagens recebidas hoje · ${dashboard.messaging.sentToday} enviadas`}
              icon={<MessageCircleMore className="h-5 w-5" />}
              tone={
                dashboard.messaging.failedToday > 0 ? "critical" : "success"
              }
            />

            <SisagMetricCard
              title="Automações"
              value={dashboard.automations.pending}
              description="execuções pendentes"
              icon={<Bot className="h-5 w-5" />}
              tone={dashboard.automations.failed > 0 ? "warning" : "neutral"}
            />
          </div>
        </SisagSection>
        <SisagSection
          title="Atividade recente"
          description="Últimos movimentos registrados na operação."
        >
          <SisagTimeline
            items={recentActivityItems.slice(0, 8)}
            emptyMessage="Nenhuma atividade recente registrada."
          />
        </SisagSection>
      </div>
    </div>
  );
}
