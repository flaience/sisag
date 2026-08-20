import { CheckCircle2, ShieldCheck, Timer, TriangleAlert } from "lucide-react";

import { SisagMetricCard, SisagStatusBadge } from "@/components/sisag";
import type { ListCommercialPostActivationAlertSlaResult } from "@/modules/commercial/commercial-post-activation-alert-sla-query.service";

type SlaData = Extract<
  ListCommercialPostActivationAlertSlaResult,
  { ok: true }
>["data"];

type Props = { data: SlaData | null };

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

export function PostActivationAlertSlaPanel({ data }: Props) {
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
        </p>
      </div>

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
            {data.items.slice(0, 10).map((item) => (
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
    </section>
  );
}
