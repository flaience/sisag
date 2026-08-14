import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Clock3,
} from "lucide-react";

import { SisagMetricCard, SisagStatusBadge } from "@/components/sisag";
import type { ListCommercialPostActivationMonitoringResult } from "@/modules/commercial/commercial-post-activation-monitoring-query.service";

type DashboardData = Extract<
  ListCommercialPostActivationMonitoringResult,
  { ok: true }
>["data"];

type Status = keyof DashboardData["summary"];

type PostActivationMonitoringDashboardProps = {
  data: DashboardData;
};

const statusPresentation: Record<Status, {
  label: string;
  tone: "neutral" | "success" | "warning" | "critical" | "info";
}> = {
  scheduled: { label: "Agendado", tone: "info" },
  waiting: { label: "Aguardando", tone: "warning" },
  overdue: { label: "Atrasado", tone: "critical" },
  escalated: { label: "Escalonado", tone: "critical" },
  completed: { label: "Concluído", tone: "success" },
};

const milestoneLabels: Record<string, string> = {
  welcome: "Boas-vindas",
  adoption_d1: "Adoção D+1",
  adoption_d3: "Adoção D+3",
  adoption_d7: "Adoção D+7",
  assisted_support_close_d14: "Encerramento D+14",
};

const indicatorLabels: Record<string, string> = {
  welcome_delivered: "Boas-vindas entregues",
  support_channel_confirmed: "Canal de suporte confirmado",
  first_login: "Primeiro acesso",
  scheduling_activity: "Atividade de agenda",
  active_channel_health: "Saúde do canal",
  appointments_created: "Agendamentos criados",
  team_activity: "Atividade da equipe",
  channel_delivery_rate: "Taxa de entrega do canal",
  weekly_scheduling_volume: "Volume semanal de agenda",
  team_adoption: "Adoção da equipe",
  support_requests: "Solicitações de suporte",
  stable_operation: "Operação estável",
  customer_acknowledgement: "Confirmação do cliente",
  open_critical_incidents: "Incidentes críticos verificados",
};

function formatDate(value: string | null) {
  if (!value) return "Sem registro";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function labelForIndicator(value: string) {
  return indicatorLabels[value] ?? value.replaceAll("_", " ");
}

export function PostActivationMonitoringDashboard({
  data,
}: PostActivationMonitoringDashboardProps) {
  const attentionCount = data.summary.escalated + data.summary.overdue;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Resumo pós-ativação">
        <SisagMetricCard
          title="Atenção imediata"
          value={attentionCount}
          description="Escalonados e atrasados"
          tone={attentionCount > 0 ? "critical" : "neutral"}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <SisagMetricCard
          title="Aguardando"
          value={data.summary.waiting}
          description="Com evidências pendentes"
          tone="warning"
          icon={<Clock3 className="h-5 w-5" />}
        />
        <SisagMetricCard
          title="Agendados"
          value={data.summary.scheduled}
          description="Dentro do prazo"
          tone="info"
          icon={<CalendarClock className="h-5 w-5" />}
        />
        <SisagMetricCard
          title="Concluídos"
          value={data.summary.completed}
          description="Planos finalizados"
          tone="success"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <SisagMetricCard
          title="Registros inválidos"
          value={data.invalidRecords}
          description="Exigem correção de dados"
          tone={data.invalidRecords > 0 ? "critical" : "neutral"}
          icon={<CircleDashed className="h-5 w-5" />}
        />
      </section>

      {data.invalidRecords > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
          <strong>{data.invalidRecords} registro(s) não puderam ser interpretados.</strong>{" "}
          Consulte o diagnóstico antes de tomar decisões sobre esses clientes.
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Clientes em acompanhamento</h2>
          <p className="mt-1 text-sm text-slate-500">Ordenados por criticidade e vencimento do próximo marco.</p>
        </div>

        {data.items.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" />
            <h3 className="mt-3 font-medium text-slate-900">Nenhum acompanhamento encontrado</h3>
            <p className="mt-1 text-sm text-slate-500">Não existem clientes para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {data.items.map((item) => {
              const monitoring = item.monitoring;
              const presentation = statusPresentation[monitoring.status];
              const current = monitoring.currentMilestone;
              return (
                <article key={item.onboardingId} className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.4fr)]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{item.clientName}</h3>
                      <SisagStatusBadge label={presentation.label} tone={presentation.tone} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Cliente {item.clientStatus} · suporte até {formatDate(monitoring.supportWindowEndsAt)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {monitoring.completedMilestones}/{monitoring.totalMilestones} marcos concluídos
                      {monitoring.escalatedMilestones > 0 ? ` · ${monitoring.escalatedMilestones} escalado(s)` : ""}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Marco atual</p>
                    <p className="mt-1 font-medium text-slate-800">{current ? milestoneLabels[current.code] ?? current.title : "Plano concluído"}</p>
                    <p className="mt-1 text-sm text-slate-500">{current ? `Prazo: ${formatDate(current.dueAt)}` : `Último processamento: ${formatDate(monitoring.lastProcessedAt)}`}</p>
                    {current && <p className="mt-1 text-xs text-slate-400">Responsável: {current.ownerType === "human" ? "Humano" : "Agente"}</p>}
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Pendências</p>
                    {monitoring.activeEscalations.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {monitoring.activeEscalations.map((value) => <SisagStatusBadge key={value} label={labelForIndicator(value)} tone="critical" />)}
                      </div>
                    ) : monitoring.missingIndicators.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {monitoring.missingIndicators.map((value) => <SisagStatusBadge key={value} label={labelForIndicator(value)} tone="warning" />)}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-emerald-700">Sem pendências registradas.</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
