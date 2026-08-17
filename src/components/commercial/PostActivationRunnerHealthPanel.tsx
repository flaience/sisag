import { Activity, CheckCircle2, Clock3, TriangleAlert } from "lucide-react";

import { SisagMetricCard, SisagStatusBadge } from "@/components/sisag";
import type { CommercialPostActivationRunnerMetricsSnapshot } from "@/modules/commercial/commercial-post-activation-runner-metrics-query.service";

type Props = {
  data: CommercialPostActivationRunnerMetricsSnapshot | null;
};

const statusPresentation = {
  healthy: { label: "Saudável", tone: "success" as const },
  degraded: { label: "Degradado", tone: "warning" as const },
  critical: { label: "Crítico", tone: "critical" as const },
};

function formatDate(value: string | null) {
  if (!value) return "Sem registro";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function PostActivationRunnerHealthPanel({ data }: Props) {
  if (!data) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Clock3 className="mt-0.5 h-5 w-5 text-slate-400" />
          <div>
            <h2 className="font-semibold text-slate-900">Saúde do processamento automático</h2>
            <p className="mt-1 text-sm text-slate-500">
              Métricas ainda não disponíveis. O estado aparecerá após a primeira execução.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const presentation = statusPresentation[data.metrics.status];
  const successRate = data.metrics.totalRuns === 0
    ? 0
    : Math.round((data.metrics.successfulRuns / data.metrics.totalRuns) * 100);

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Saúde do processamento automático">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Automação pós-ativação
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Saúde do processamento automático
            </h2>
            <SisagStatusBadge label={presentation.label} tone={presentation.tone} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Última execução: {formatDate(data.metrics.lastRunAt)} · ID {data.executionKey}
          </p>
        </div>
        <p className="text-xs text-slate-400">Atualizado em {formatDate(data.executedAt)}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SisagMetricCard
          title="Execuções"
          value={data.metrics.totalRuns}
          description={`${successRate}% de sucesso`}
          tone="info"
          icon={<Activity className="h-5 w-5" />}
        />
        <SisagMetricCard
          title="Bem-sucedidas"
          value={data.metrics.successfulRuns}
          description={`Última: ${formatDate(data.metrics.lastSuccessfulRunAt)}`}
          tone="success"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <SisagMetricCard
          title="Falhas"
          value={data.metrics.failedRuns}
          description={`Última: ${formatDate(data.metrics.lastFailureAt)}`}
          tone={data.metrics.failedRuns > 0 ? "warning" : "neutral"}
          icon={<TriangleAlert className="h-5 w-5" />}
        />
        <SisagMetricCard
          title="Falhas consecutivas"
          value={data.metrics.consecutiveFailedRuns}
          description={data.metrics.consecutiveFailedRuns > 0
            ? "Requer acompanhamento"
            : "Operação estável"}
          tone={data.metrics.consecutiveFailedRuns > 0 ? "critical" : "success"}
          icon={<TriangleAlert className="h-5 w-5" />}
        />
      </div>
    </section>
  );
}
