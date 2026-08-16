import { CheckCircle2, Download, History, UserCheck } from "lucide-react";

import { SisagStatusBadge } from "@/components/sisag";
import type { ListCommercialPostActivationAlertHistoryResult } from "@/modules/commercial/commercial-post-activation-alert-history.service";

type HistoryData = Extract<
  ListCommercialPostActivationAlertHistoryResult,
  { ok: true }
>["data"];

const actorLabels = {
  human: "Operador",
  agent: "Agente",
  system: "Sistema",
} as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

type HistoryFilters = {
  action?: "acknowledged" | "resolved";
  actorType?: "human" | "agent" | "system";
  limit?: number;
};

type PreservedMonitoringFilters = {
  status?: string;
  limit?: number;
};

function exportHref(filters: HistoryFilters) {
  const params = new URLSearchParams();
  if (filters.action) params.set("action", filters.action);
  if (filters.actorType) params.set("actorType", filters.actorType);
  params.set("limit", String(filters.limit ?? 100));
  return `/platform/commercial/post-activation/export?${params.toString()}`;
}

export function PostActivationAlertHistoryPanel({
  data,
  filters,
  preservedMonitoringFilters,
}: {
  data: HistoryData | null;
  filters: HistoryFilters;
  preservedMonitoringFilters: PreservedMonitoringFilters;
}) {
  if (!data) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5" role="status">
        <div className="flex items-start gap-3">
          <History className="mt-0.5 h-5 w-5 text-slate-500" />
          <div>
            <h2 className="font-semibold text-slate-900">Histórico temporariamente indisponível</h2>
            <p className="mt-1 text-sm text-slate-600">Os alertas ativos e o monitoramento continuam disponíveis.</p>
          </div>
        </div>
      </section>
    );
  }

  if (data.items.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-slate-500" />
          <div>
            <h2 className="font-semibold text-slate-900">Nenhuma ação registrada</h2>
            <p className="mt-1 text-sm text-slate-600">O histórico aparecerá após o primeiro reconhecimento ou resolução.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Histórico dos alertas">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-slate-950">
            <History className="h-5 w-5" />
            Histórico dos alertas
          </h2>
          <p className="mt-1 text-sm text-slate-600">Ações operacionais mais recentes.</p>
          <p className="mt-1 text-sm font-medium text-slate-700">
            {data.summary.acknowledged} reconhecido(s) · {data.summary.resolved} resolvido(s)
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <form className="grid gap-3 sm:grid-cols-[150px_140px_90px_auto]" method="get">
          {preservedMonitoringFilters.status ? (
            <input type="hidden" name="status" value={preservedMonitoringFilters.status} />
          ) : null}
          {preservedMonitoringFilters.limit ? (
            <input type="hidden" name="limit" value={preservedMonitoringFilters.limit} />
          ) : null}
          <label className="text-xs font-medium text-slate-600">
            Ação
            <select name="historyAction" defaultValue={filters.action ?? ""} className="mt-1 block h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800">
              <option value="">Todas</option>
              <option value="acknowledged">Reconhecidos</option>
              <option value="resolved">Resolvidos</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Responsável
            <select name="historyActorType" defaultValue={filters.actorType ?? ""} className="mt-1 block h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800">
              <option value="">Todos</option>
              <option value="human">Operador</option>
              <option value="agent">Agente</option>
              <option value="system">Sistema</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Limite
            <input name="historyLimit" type="number" min={1} max={100} defaultValue={filters.limit ?? 10} className="mt-1 block h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800" />
          </label>
          <button type="submit" className="self-end rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-600">
            Filtrar
          </button>
        </form>
        <a
          href={exportHref(filters)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </a>
        </div>
      </div>

      <div className="divide-y divide-slate-200">
        {data.items.map((item) => (
          <article key={`${item.onboardingId}:${item.idempotencyKey}`} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-slate-900">{item.clientName}</h3>
                <SisagStatusBadge
                  label={item.action === "acknowledged" ? "Reconhecido" : "Resolvido"}
                  tone={item.action === "acknowledged" ? "info" : "success"}
                />
              </div>
              <p className="mt-1 break-all text-xs text-slate-500">{item.alertKey}</p>
            </div>

            <div>
              <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                <UserCheck className="h-4 w-4" /> Responsável
              </p>
              <p className="mt-1 text-sm font-medium text-slate-800">{actorLabels[item.actor.type]}</p>
              <p className="mt-1 text-xs text-slate-500">{item.actor.id}</p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Registrado em</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{formatDate(item.actedAt)}</p>
              {item.note ? <p className="mt-2 text-sm text-slate-600">{item.note}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
