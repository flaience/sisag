import Link from "next/link";
import { CheckCircle2, ShieldCheck, Timer, TriangleAlert } from "lucide-react";

import { SisagMetricCard, SisagStatusBadge } from "@/components/sisag";
import type {
  ListCommercialPostActivationAlertSlaInput,
  ListCommercialPostActivationAlertSlaResult,
} from "@/modules/commercial/commercial-post-activation-alert-sla-query.service";

type SlaData = Extract<
  ListCommercialPostActivationAlertSlaResult,
  { ok: true }
>["data"];

type Props = {
  data: SlaData | null;
  filters?: ListCommercialPostActivationAlertSlaInput;
  preservedFilters?: Record<string, string | number | undefined>;
};

function formatDate(value: string | null) {
  if (!value) return "Em aberto";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatMinutes(value: number) {
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

export function PostActivationAlertSlaPanel({
  data,
  filters = {},
  preservedFilters = {},
}: Props) {
  if (!data) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">SLA dos alertas operacionais</h2>
        <p className="mt-1 text-sm text-slate-500">
          Indicadores temporariamente indisponíveis. Os demais dados permanecem acessíveis.
        </p>
      </section>
    );
  }

  const healthy = data.summary.acknowledgementBreached === 0
    && data.summary.resolutionBreached === 0;
  const exportParams = new URLSearchParams();
  if (filters.severity) exportParams.set("severity", filters.severity);
  if (filters.lifecycle) exportParams.set("lifecycle", filters.lifecycle);
  if (filters.breach) exportParams.set("breach", filters.breach);
  exportParams.set("limit", String(filters.limit ?? 1000));
  const exportHref = `/platform/commercial/post-activation/sla-export?${exportParams.toString()}`;
  const pageHref = (offset: number) => {
    const params = new URLSearchParams();
    for (const [name, value] of Object.entries(preservedFilters)) {
      if (value !== undefined) params.set(name, String(value));
    }
    if (filters.severity) params.set("slaSeverity", filters.severity);
    if (filters.lifecycle) params.set("slaLifecycle", filters.lifecycle);
    if (filters.breach) params.set("slaBreach", filters.breach);
    params.set("slaLimit", String(data.pagination.limit));
    if (offset > 0) params.set("slaOffset", String(offset));
    return `/platform/commercial/post-activation?${params.toString()}`;
  };
  const previousOffset = Math.max(0, data.pagination.offset - data.pagination.limit);
  const nextOffset = data.pagination.offset + data.pagination.limit;

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="SLA dos alertas operacionais">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Qualidade operacional
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">SLA dos alertas operacionais</h2>
            <SisagStatusBadge
              label={healthy ? "Dentro da meta" : "Requer atenção"}
              tone={healthy ? "success" : "critical"}
            />
          </div>
        </div>
        <p className="text-xs text-slate-400">
          {data.invalidRecords === 0
            ? "Dados consistentes"
            : `${data.invalidRecords} registro(s) inválido(s)`}
          <Link href={exportHref} className="ml-3 font-medium text-slate-700 underline underline-offset-4">
            Exportar CSV
          </Link>
        </p>
      </div>

      <form className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-[150px_160px_180px_90px_auto]" method="get">
        {Object.entries(preservedFilters).map(([name, value]) => (
          value === undefined ? null : <input key={name} type="hidden" name={name} value={value} />
        ))}
        <input type="hidden" name="slaOffset" value="0" />
        <label className="text-xs font-medium text-slate-600">
          Severidade
          <select name="slaSeverity" defaultValue={filters.severity ?? ""} className="mt-1 block h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800">
            <option value="">Todas</option>
            <option value="critical">Crítica</option>
            <option value="high">Alta</option>
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          Situação
          <select name="slaLifecycle" defaultValue={filters.lifecycle ?? ""} className="mt-1 block h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800">
            <option value="">Todas</option>
            <option value="new">Novo</option>
            <option value="acknowledged">Reconhecido</option>
            <option value="resolved">Resolvido</option>
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          Violação
          <select name="slaBreach" defaultValue={filters.breach ?? ""} className="mt-1 block h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800">
            <option value="">Todas</option>
            <option value="any">Qualquer violação</option>
            <option value="acknowledgement">Reconhecimento</option>
            <option value="resolution">Resolução</option>
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          Limite
          <input name="slaLimit" type="number" min={1} max={1000} defaultValue={filters.limit ?? 100} className="mt-1 block h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800" />
        </label>
        <button type="submit" className="self-end rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800">
          Filtrar SLA
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SisagMetricCard
          title="Conformidade"
          value={`${data.summary.complianceRate}%`}
          description={`${data.summary.withinSla} de ${data.summary.total} dentro do SLA`}
          tone={healthy ? "success" : "warning"}
          icon={<ShieldCheck className="h-5 w-5" />}
        />
        <SisagMetricCard
          title="Em aberto"
          value={data.summary.open}
          description={`${data.summary.acknowledged} reconhecido(s)`}
          tone={data.summary.open > 0 ? "info" : "neutral"}
          icon={<Timer className="h-5 w-5" />}
        />
        <SisagMetricCard
          title="Reconhecimento fora do SLA"
          value={data.summary.acknowledgementBreached}
          description="Tempo até a primeira ação"
          tone={data.summary.acknowledgementBreached > 0 ? "warning" : "success"}
          icon={<TriangleAlert className="h-5 w-5" />}
        />
        <SisagMetricCard
          title="Resolução fora do SLA"
          value={data.summary.resolutionBreached}
          description={`${data.summary.resolved} ocorrência(s) resolvida(s)`}
          tone={data.summary.resolutionBreached > 0 ? "critical" : "success"}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
      </div>

      {data.items.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="divide-y divide-slate-200">
            {data.items.map((item) => (
              <article key={item.alertKey} className="grid gap-3 p-4 text-sm lg:grid-cols-[minmax(0,1.5fr)_1fr_1fr]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{item.severity === "critical" ? "Crítico" : "Alto"}</p>
                    <SisagStatusBadge
                      label={item.lifecycle === "resolved" ? "Resolvido" : item.lifecycle === "acknowledged" ? "Reconhecido" : "Novo"}
                      tone={item.lifecycle === "resolved" ? "success" : "warning"}
                    />
                  </div>
                  <p className="mt-1 break-all text-xs text-slate-500">{item.alertKey}</p>
                  <p className="mt-1 text-xs text-slate-400">Aberto em {formatDate(item.openedAt)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Reconhecimento</p>
                  <p className="mt-1 text-slate-700">{formatMinutes(item.acknowledgementMinutes)} / meta {formatMinutes(item.acknowledgementTargetMinutes)}</p>
                  <p className={item.acknowledgementBreached ? "mt-1 text-xs text-amber-700" : "mt-1 text-xs text-emerald-700"}>{item.acknowledgementBreached ? "Meta excedida" : "Dentro da meta"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Resolução</p>
                  <p className="mt-1 text-slate-700">{formatMinutes(item.resolutionMinutes)} / meta {formatMinutes(item.resolutionTargetMinutes)}</p>
                  <p className={item.resolutionBreached ? "mt-1 text-xs text-rose-700" : "mt-1 text-xs text-emerald-700"}>{item.resolutionBreached ? "Meta excedida" : `Dentro da meta · ${formatDate(item.resolvedAt)}`}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Nenhuma ocorrência disponível para cálculo de SLA.</p>
      )}

      <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Paginação do SLA dos alertas">
        <p className="text-xs text-slate-500">
          {data.pagination.total === 0
            ? "Nenhuma ocorrência"
            : `${data.pagination.offset + 1}–${data.pagination.offset + data.items.length} de ${data.pagination.total}`}
        </p>
        <div className="flex gap-2">
          {data.pagination.hasPrevious ? (
            <Link href={pageHref(previousOffset)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
              Anterior
            </Link>
          ) : null}
          {data.pagination.hasNext ? (
            <Link href={pageHref(nextOffset)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
              Próxima
            </Link>
          ) : null}
        </div>
      </nav>
    </section>
  );
}
