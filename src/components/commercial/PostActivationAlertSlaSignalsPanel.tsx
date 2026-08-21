import { AlarmClock, ShieldAlert, TimerReset, TriangleAlert } from "lucide-react";

import { SisagMetricCard, SisagStatusBadge } from "@/components/sisag";
import type {
  ListCommercialPostActivationAlertSlaSignalsInput,
  ListCommercialPostActivationAlertSlaSignalsResult,
} from "@/modules/commercial/commercial-post-activation-alert-sla-signal-query.service";

type SignalData = Extract<
  ListCommercialPostActivationAlertSlaSignalsResult,
  { ok: true }
>["data"];

type Props = {
  data: SignalData | null;
  filters?: ListCommercialPostActivationAlertSlaSignalsInput;
  preservedFilters?: Record<string, string | number | undefined>;
};

export function PostActivationAlertSlaSignalsPanel({
  data,
  filters = {},
  preservedFilters = {},
}: Props) {
  if (!data) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Sinais acionáveis de SLA</h2>
        <p className="mt-1 text-sm text-slate-500">
          Sinais temporariamente indisponíveis. Os demais dados permanecem acessíveis.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Sinais acionáveis de SLA">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Ação operacional</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Sinais acionáveis de SLA</h2>
            <SisagStatusBadge
              label={data.summary.total === 0 ? "Operação estável" : "Requer atenção"}
              tone={data.summary.total === 0 ? "success" : "critical"}
            />
          </div>
        </div>
        <p className="text-xs text-slate-400">
          {data.sourceInvalidRecords === 0
            ? "Dados consistentes"
            : `${data.sourceInvalidRecords} registro(s) inválido(s) na origem`}
        </p>
      </div>

      <form className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-[170px_220px_100px_auto]" method="get">
        {Object.entries(preservedFilters).map(([name, value]) => (
          value === undefined ? null : <input key={name} type="hidden" name={name} value={value} />
        ))}
        <label className="text-xs font-medium text-slate-600">
          Severidade
          <select name="slaSignalSeverity" defaultValue={filters.severity ?? ""} className="mt-1 block h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800">
            <option value="">Todas</option>
            <option value="critical">Crítica</option>
            <option value="high">Alta</option>
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          Tipo de violação
          <select name="slaSignalType" defaultValue={filters.type ?? ""} className="mt-1 block h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800">
            <option value="">Todos</option>
            <option value="acknowledgement_breached">Reconhecimento</option>
            <option value="resolution_breached">Resolução</option>
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          Limite
          <input name="slaSignalLimit" type="number" min={1} max={100} defaultValue={filters.limit ?? 25} className="mt-1 block h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800" />
        </label>
        <button type="submit" className="self-end rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800">
          Filtrar sinais
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SisagMetricCard title="Sinais ativos" value={data.summary.total} description="Violações ainda acionáveis" tone={data.summary.total ? "warning" : "success"} icon={<ShieldAlert className="h-5 w-5" />} />
        <SisagMetricCard title="Críticos" value={data.summary.critical} description="Prioridade imediata" tone={data.summary.critical ? "critical" : "neutral"} icon={<TriangleAlert className="h-5 w-5" />} />
        <SisagMetricCard title="Reconhecimento" value={data.summary.acknowledgementBreached} description="Fora da meta inicial" tone={data.summary.acknowledgementBreached ? "warning" : "neutral"} icon={<AlarmClock className="h-5 w-5" />} />
        <SisagMetricCard title="Resolução" value={data.summary.resolutionBreached} description="Fora da meta final" tone={data.summary.resolutionBreached ? "critical" : "neutral"} icon={<TimerReset className="h-5 w-5" />} />
      </div>

      {data.signals.length === 0 ? (
        <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          Nenhum sinal acionável de SLA no momento.
        </p>
      ) : (
        <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
          {data.signals.map((signal) => (
            <article key={signal.key} className="grid gap-3 p-4 text-sm lg:grid-cols-[minmax(0,1.5fr)_1fr_1fr]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <SisagStatusBadge label={signal.severity === "critical" ? "Crítico" : "Alto"} tone={signal.severity === "critical" ? "critical" : "warning"} />
                  <p className="font-medium text-slate-900">
                    {signal.type === "acknowledgement_breached" ? "Reconhecimento fora do SLA" : "Resolução fora do SLA"}
                  </p>
                </div>
                <p className="mt-1 break-all text-xs text-slate-500">{signal.alertKey}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Tempo atual</p>
                <p className="mt-1 text-slate-700">{signal.elapsedMinutes} min · meta {signal.targetMinutes} min</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Atraso</p>
                <p className="mt-1 font-medium text-rose-700">{signal.overdueMinutes} min acima da meta</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
