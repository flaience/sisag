import { CheckCircle2, History, UserCheck } from "lucide-react";

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

export function PostActivationAlertHistoryPanel({ data }: { data: HistoryData | null }) {
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
      <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-slate-950">
            <History className="h-5 w-5" />
            Histórico dos alertas
          </h2>
          <p className="mt-1 text-sm text-slate-600">Ações operacionais mais recentes.</p>
        </div>
        <p className="text-sm font-medium text-slate-700">
          {data.summary.acknowledged} reconhecido(s) · {data.summary.resolved} resolvido(s)
        </p>
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
