import { AlertTriangle, Clock3, ShieldAlert } from "lucide-react";

import { SisagMetricCard, SisagStatusBadge } from "@/components/sisag";
import type { ListCommercialPostActivationDueWorkDeferralsResult } from "@/modules/commercial/commercial-post-activation-due-work-deferral-query.service";

type Data = Extract<
  ListCommercialPostActivationDueWorkDeferralsResult,
  { ok: true }
>["data"];

type Filters = {
  state?: "all" | "waiting" | "escalated";
  limit?: number;
  offset?: number;
};

type Props = {
  data: Data | null;
  filters: Filters;
  preservedFilters?: Record<string, string | number | undefined>;
};

const presentation = {
  healthy: { label: "Estável", tone: "success" as const },
  degraded: { label: "Em espera", tone: "warning" as const },
  critical: { label: "Ação necessária", tone: "critical" as const },
};

const reasonLabel = {
  business_wait: "Aguardando condição de negócio",
  deferral_limit_reached: "Limite de adiamentos atingido",
  wait_deadline_reached: "Prazo máximo de espera atingido",
};

function duration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function date(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function href(
  filters: Filters,
  preserved: Record<string, string | number | undefined>,
  offset: number,
) {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(preserved)) {
    if (value !== undefined && value !== "") params.set(name, String(value));
  }
  if (filters.state && filters.state !== "all") params.set("dueDeferralState", filters.state);
  if (filters.limit) params.set("dueDeferralLimit", String(filters.limit));
  if (offset > 0) params.set("dueDeferralOffset", String(offset));
  return `/platform/commercial/post-activation?${params.toString()}`;
}

export function PostActivationDueWorkDeferralPanel({
  data,
  filters,
  preservedFilters = {},
}: Props) {
  if (!data) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Esperas e escalonamentos</h2>
        <p className="mt-1 text-sm text-slate-500">
          Indicadores temporariamente indisponíveis. Os demais dados permanecem acessíveis.
        </p>
      </section>
    );
  }

  const status = presentation[data.status];
  const previousOffset = Math.max(0, data.offset - data.limit);
  const nextOffset = data.offset + data.limit;

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Esperas e escalonamentos pós-ativação">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Supervisão operacional</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Esperas e escalonamentos</h2>
            <SisagStatusBadge label={status.label} tone={status.tone} />
          </div>
          <p className="mt-1 text-sm text-slate-500">Condições de negócio persistidas sem bloquear o runner.</p>
        </div>

        <form method="get" className="grid gap-2 sm:grid-cols-[180px_100px_auto]">
          {Object.entries(preservedFilters).map(([name, value]) => (
            value === undefined ? null : <input key={name} type="hidden" name={name} value={value} />
          ))}
          <label className="text-xs font-medium text-slate-600">
            Situação
            <select name="dueDeferralState" defaultValue={filters.state ?? "all"} className="mt-1 block h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
              <option value="all">Todas</option>
              <option value="waiting">Aguardando</option>
              <option value="escalated">Escaladas</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Limite
            <input name="dueDeferralLimit" type="number" min={1} max={100} defaultValue={filters.limit ?? 25} className="mt-1 block h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" />
          </label>
          <button type="submit" className="self-end rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white">Filtrar</button>
        </form>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SisagMetricCard title="Em espera" value={data.waiting} description="Reavaliação automática programada" tone={data.waiting ? "warning" : "neutral"} icon={<Clock3 className="h-5 w-5" />} />
        <SisagMetricCard title="Escalados" value={data.escalated} description="Exigem ação operacional" tone={data.escalated ? "critical" : "success"} icon={<ShieldAlert className="h-5 w-5" />} />
        <SisagMetricCard title="Total acompanhado" value={data.total} description={`${data.filteredTotal} no filtro atual`} tone="info" icon={<AlertTriangle className="h-5 w-5" />} />
      </div>

      {data.items.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Nenhuma espera ou escalonamento no recorte atual.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-2">Marco</th><th className="px-3 py-2">Situação</th><th className="px-3 py-2">Adiamentos</th><th className="px-3 py-2">Idade</th><th className="px-3 py-2">Próxima verificação</th><th className="px-3 py-2">Prazo máximo</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((item) => (
                <tr key={item.workId}>
                  <td className="px-3 py-3 font-medium text-slate-900">{item.milestoneCode}</td>
                  <td className="px-3 py-3"><span className={item.escalationRequired ? "text-rose-700" : "text-amber-700"}>{reasonLabel[item.lastDeferralReason]}</span></td>
                  <td className="px-3 py-3 text-slate-600">{item.deferredCount}</td>
                  <td className="px-3 py-3 text-slate-600">{duration(item.waitAgeSeconds)}</td>
                  <td className="px-3 py-3 text-slate-600">{item.escalationRequired ? "Intervenção necessária" : `${duration(item.nextAvailableInSeconds)} · ${date(item.availableAt)}`}</td>
                  <td className="px-3 py-3 text-slate-600">{duration(item.waitRemainingSeconds)} · {date(item.waitDeadlineAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{data.filteredTotal === 0 ? "0 de 0" : `${data.offset + 1}–${data.offset + data.items.length} de ${data.filteredTotal}`}</span>
        <div className="flex gap-2">
          {data.offset > 0 ? <a href={href(filters, preservedFilters, previousOffset)} className="rounded-lg border border-slate-200 px-3 py-2">Anterior</a> : null}
          {data.hasNext ? <a href={href(filters, preservedFilters, nextOffset)} className="rounded-lg bg-slate-900 px-3 py-2 text-white">Próxima</a> : null}
        </div>
      </div>
    </section>
  );
}
