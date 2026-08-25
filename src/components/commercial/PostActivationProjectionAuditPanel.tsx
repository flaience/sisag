import { CheckCircle2, GitCompareArrows, History, ShieldAlert } from "lucide-react";

import { SisagMetricCard, SisagStatusBadge } from "@/components/sisag";
import type { QueryCommercialPostActivationProjectionAuditResult } from "@/modules/commercial/commercial-post-activation-due-work-projection-audit-query.service";

type Data = Extract<
  QueryCommercialPostActivationProjectionAuditResult,
  { ok: true }
>["data"];

type Props = { data: Data | null };

const presentation = {
  collecting: {
    label: "Coletando evidências",
    tone: "warning" as const,
    recommendation: "Mantenha os dois caminhos ativos até completar todos os critérios da janela controlada.",
  },
  ready: {
    label: "Critérios atendidos",
    tone: "success" as const,
    recommendation: "A comparação autoriza preparar o corte em uma entrega separada, reversível e monitorada.",
  },
  blocked: {
    label: "Migração bloqueada",
    tone: "critical" as const,
    recommendation: "Mantenha o caminho legado e investigue as divergências antes de qualquer corte.",
  },
};

const reasonLabel = {
  divergence_detected: "Divergência entre projeção e runner legado",
  projection_failure_detected: "Falha registrada durante a projeção",
  insufficient_observations: "Janela mínima de observações ainda incompleta",
  no_completed_cursor_cycle: "Nenhuma volta completa do cursor observada",
  no_completed_work_observed: "Nenhum trabalho concluído observado na janela",
};

function date(value: string | null) {
  if (!value) return "Ainda não registrado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function PostActivationProjectionAuditPanel({ data }: Props) {
  if (!data) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Validação do novo processamento</h2>
        <p className="mt-1 text-sm text-slate-500">
          Histórico de comparação temporariamente indisponível. O processamento permanece protegido.
        </p>
      </section>
    );
  }

  const status = presentation[data.status];
  const differenceEntries = Object.entries(data.differences)
    .sort((left, right) => right[1] - left[1]);

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Validação do processamento indexado pós-ativação">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Controle de migração</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Validação do novo processamento</h2>
          <SisagStatusBadge label={status.label} tone={status.tone} />
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Compara a projeção indexada com o caminho anterior antes de autorizar sua retirada.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SisagMetricCard
          title="Observações"
          value={`${data.observations}/${data.requiredObservations}`}
          description={`${data.matched} compatíveis · ${data.divergent} divergentes`}
          tone={data.divergent ? "critical" : data.observations < data.requiredObservations ? "warning" : "success"}
          icon={<History className="h-5 w-5" />}
        />
        <SisagMetricCard
          title="Compatibilidade"
          value={`${data.matchRatePercent}%`}
          description="Comparações sem divergência"
          tone={data.matchRatePercent === 100 ? "success" : "critical"}
          icon={<GitCompareArrows className="h-5 w-5" />}
        />
        <SisagMetricCard
          title="Ciclos observados"
          value={data.wrappedObservations}
          description="Voltas completas do cursor"
          tone={data.wrappedObservations ? "success" : "warning"}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <SisagMetricCard
          title="Falhas de projeção"
          value={data.projectionFailures}
          description={`${data.synchronized} sincronizações · ${data.completed} concluídos`}
          tone={data.projectionFailures ? "critical" : "success"}
          icon={<ShieldAlert className="h-5 w-5" />}
        />
      </div>

      <div className={`rounded-xl border p-4 text-sm ${
        data.status === "ready"
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : data.status === "blocked"
            ? "border-rose-200 bg-rose-50 text-rose-900"
            : "border-amber-200 bg-amber-50 text-amber-900"
      }`}>
        <p className="font-semibold">Orientação</p>
        <p className="mt-1">{status.recommendation}</p>
      </div>

      {data.reasons.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Critérios pendentes ou bloqueadores</h3>
          <ul className="mt-2 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            {data.reasons.map((reason) => (
              <li key={reason} className="rounded-lg bg-slate-50 px-3 py-2">{reasonLabel[reason]}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {differenceEntries.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Divergências encontradas</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {differenceEntries.map(([name, count]) => (
              <span key={name} className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                {name}: {count}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-1 border-t border-slate-100 pt-3 text-xs text-slate-500 sm:flex-row sm:justify-between">
        <span>Primeira observação: {date(data.firstObservedAt)}</span>
        <span>Última observação: {date(data.lastObservedAt)}</span>
      </div>
    </section>
  );
}
