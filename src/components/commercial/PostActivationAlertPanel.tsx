import { AlertOctagon, CheckCircle2, ClockAlert } from "lucide-react";

import { PostActivationAlertActions } from "@/components/commercial/PostActivationAlertActions";
import { SisagStatusBadge } from "@/components/sisag";
import type { ListCommercialPostActivationAlertsResult } from "@/modules/commercial/commercial-post-activation-alert-query.service";

type AlertData = Extract<
  ListCommercialPostActivationAlertsResult,
  { ok: true }
>["data"];

const reasonLabels: Record<string, string> = {
  historical_escalation: "Escalonamento anterior pendente",
  milestone_due_without_observations: "Marco vencido sem observações",
  open_critical_incidents: "Incidentes críticos abertos",
  first_login: "Primeiro acesso pendente",
  scheduling_activity: "Atividade de agenda pendente",
};

function labelForReason(value: string) {
  return reasonLabels[value] ?? value.replaceAll("_", " ");
}

function formatDate(value: string | null) {
  if (!value) return "Sem prazo registrado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function PostActivationAlertPanel({ data }: { data: AlertData | null }) {
  if (!data) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5" role="status">
        <div className="flex items-start gap-3">
          <ClockAlert className="mt-0.5 h-5 w-5 text-amber-700" />
          <div>
            <h2 className="font-semibold text-amber-950">Alertas temporariamente indisponíveis</h2>
            <p className="mt-1 text-sm text-amber-800">O monitoramento permanece disponível para consulta.</p>
          </div>
        </div>
      </section>
    );
  }

  if (data.alerts.length === 0) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-700" />
          <div>
            <h2 className="font-semibold text-emerald-950">Nenhum alerta operacional ativo</h2>
            <p className="mt-1 text-sm text-emerald-800">Não há escalonamentos ou marcos vencidos no recorte atual.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-sm" aria-label="Alertas operacionais">
      <div className="flex flex-col gap-2 border-b border-rose-100 bg-rose-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-rose-950">
            <AlertOctagon className="h-5 w-5" />
            Alertas operacionais
          </h2>
          <p className="mt-1 text-sm text-rose-800">Ordenados por criticidade e vencimento.</p>
        </div>
        <div className="text-sm font-medium text-rose-900">
          <p>{data.summary.critical} crítico(s) · {data.summary.high} alto(s)</p>
          <p className="mt-1 text-xs font-normal text-rose-700">
            {data.summary.new} novo(s) · {data.summary.acknowledged} reconhecido(s)
          </p>
        </div>
      </div>

      <div className="divide-y divide-slate-200">
        {data.alerts.map((alert) => (
          <article key={alert.key} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-slate-900">{alert.clientName}</h3>
                <SisagStatusBadge
                  label={alert.severity === "critical" ? "Crítico" : "Alto"}
                  tone="critical"
                />
                <SisagStatusBadge
                  label={alert.lifecycle === "acknowledged" ? "Reconhecido" : "Novo"}
                  tone={alert.lifecycle === "acknowledged" ? "info" : "warning"}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {alert.category === "human_escalation" ? "Escalonamento humano" : "Marco atrasado"}
              </p>
              {alert.acknowledgedAt ? (
                <p className="mt-1 text-xs text-blue-700">
                  Reconhecido em {formatDate(alert.acknowledgedAt)}
                </p>
              ) : null}
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Marco</p>
              <p className="mt-1 font-medium text-slate-800">{alert.milestoneTitle ?? "Plano pós-ativação"}</p>
              <p className="mt-1 text-sm text-slate-500">Prazo: {formatDate(alert.dueAt)}</p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Motivos</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {alert.reasons.map((reason) => (
                  <SisagStatusBadge key={reason} label={labelForReason(reason)} tone="critical" />
                ))}
              </div>
              <PostActivationAlertActions
                onboardingId={alert.onboardingId}
                alertKey={alert.key}
                lifecycle={alert.lifecycle}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
