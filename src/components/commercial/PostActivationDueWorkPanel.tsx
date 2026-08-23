import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ListChecks,
  LockKeyhole,
  PlayCircle,
  RotateCcw,
  TimerOff,
} from "lucide-react";

import { SisagMetricCard, SisagStatusBadge } from "@/components/sisag";
import type { GetCommercialPostActivationDueWorkSnapshotResult } from "@/modules/commercial/commercial-post-activation-due-work-query.service";

type DueWorkSnapshot = Extract<
  GetCommercialPostActivationDueWorkSnapshotResult,
  { ok: true }
>["data"];

type Props = {
  data: DueWorkSnapshot | null;
};

const statusPresentation = {
  healthy: { label: "Saudável", tone: "success" as const },
  degraded: { label: "Atenção", tone: "warning" as const },
  critical: { label: "Crítica", tone: "critical" as const },
};

function formatDate(value: string | null) {
  if (!value) return "Sem trabalho pendente";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatAge(seconds: number | null) {
  if (seconds === null) return "Sem trabalho pendente";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function PostActivationDueWorkPanel({ data }: Props) {
  if (!data) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Clock3 className="mt-0.5 h-5 w-5 text-slate-400" />
          <div>
            <h2 className="font-semibold text-slate-900">Fila de trabalhos pós-ativação</h2>
            <p className="mt-1 text-sm text-slate-500">
              Indicadores temporariamente indisponíveis. Os demais dados permanecem acessíveis.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const presentation = statusPresentation[data.status];

  return (
    <section
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      aria-label="Fila de trabalhos pós-ativação"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Capacidade operacional
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Fila de trabalhos pós-ativação
            </h2>
            <SisagStatusBadge label={presentation.label} tone={presentation.tone} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Mais antigo: {formatDate(data.oldestOutstandingAt)} · Idade {formatAge(data.oldestOutstandingAgeSeconds)}
          </p>
        </div>
        <p className="text-xs text-slate-400">
          Atualizado em {formatDate(data.recordedAt)}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SisagMetricCard
          title="Agendados"
          value={data.scheduled}
          description={`${data.claimable} acionável(is) agora`}
          tone={data.overdue > 0 ? "warning" : "info"}
          icon={<ListChecks className="h-5 w-5" />}
        />
        <SisagMetricCard
          title="Processando"
          value={data.processing}
          description={`${data.expiredLocks} lock(s) expirado(s)`}
          tone={data.expiredLocks > 0 ? "critical" : "info"}
          icon={<PlayCircle className="h-5 w-5" />}
        />
        <SisagMetricCard
          title="Concluídos"
          value={data.completed}
          description={`${data.total} trabalho(s) projetado(s)`}
          tone="success"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <SisagMetricCard
          title="Falhos"
          value={data.failed}
          description={`${data.totalAttempts} tentativa(s) acumulada(s)`}
          tone={data.failed > 0 ? "critical" : "neutral"}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <SisagMetricCard
          title="Backlog acionável"
          value={data.claimable}
          description="Disponíveis para processamento"
          tone={data.claimable > 0 ? "info" : "neutral"}
          icon={<RotateCcw className="h-5 w-5" />}
        />
        <SisagMetricCard
          title="Vencidos"
          value={data.overdue}
          description="Exigem acompanhamento"
          tone={data.overdue > 0 ? "warning" : "success"}
          icon={<TimerOff className="h-5 w-5" />}
        />
        <SisagMetricCard
          title="Locks expirados"
          value={data.expiredLocks}
          description="Processamentos recuperáveis"
          tone={data.expiredLocks > 0 ? "critical" : "success"}
          icon={<LockKeyhole className="h-5 w-5" />}
        />
        <SisagMetricCard
          title="Tentativas"
          value={data.totalAttempts}
          description="Acumuladas na fila"
          tone="neutral"
          icon={<RotateCcw className="h-5 w-5" />}
        />
      </div>
    </section>
  );
}
