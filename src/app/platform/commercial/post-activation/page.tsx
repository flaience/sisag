import { PostActivationAlertPanel } from "@/components/commercial/PostActivationAlertPanel";
import { PostActivationAlertHistoryPanel } from "@/components/commercial/PostActivationAlertHistoryPanel";
import { PostActivationAlertSlaPanel } from "@/components/commercial/PostActivationAlertSlaPanel";
import { PostActivationAlertSlaSignalsPanel } from "@/components/commercial/PostActivationAlertSlaSignalsPanel";
import { PostActivationDueWorkPanel } from "@/components/commercial/PostActivationDueWorkPanel";
import { PostActivationDueWorkDeferralPanel } from "@/components/commercial/PostActivationDueWorkDeferralPanel";
import { PostActivationMonitoringDashboard } from "@/components/commercial/PostActivationMonitoringDashboard";
import { PostActivationProjectionAuditPanel } from "@/components/commercial/PostActivationProjectionAuditPanel";
import { PostActivationRunnerHealthPanel } from "@/components/commercial/PostActivationRunnerHealthPanel";
import {
  listCommercialPostActivationAlertHistory,
  type ListCommercialPostActivationAlertHistoryInput,
  type ListCommercialPostActivationAlertHistoryResult,
} from "@/modules/commercial/commercial-post-activation-alert-history.service";
import {
  listCommercialPostActivationAlerts,
  type ListCommercialPostActivationAlertsResult,
} from "@/modules/commercial/commercial-post-activation-alert-query.service";
import {
  listCommercialPostActivationAlertSla,
  type ListCommercialPostActivationAlertSlaInput,
  type ListCommercialPostActivationAlertSlaResult,
} from "@/modules/commercial/commercial-post-activation-alert-sla-query.service";
import {
  listCommercialPostActivationAlertSlaSignals,
  type ListCommercialPostActivationAlertSlaSignalsInput,
  type ListCommercialPostActivationAlertSlaSignalsResult,
} from "@/modules/commercial/commercial-post-activation-alert-sla-signal-query.service";
import {
  getCommercialPostActivationDueWorkSnapshot,
  type GetCommercialPostActivationDueWorkSnapshotResult,
} from "@/modules/commercial/commercial-post-activation-due-work-query.service";
import {
  listCommercialPostActivationDueWorkDeferrals,
  type ListCommercialPostActivationDueWorkDeferralsResult,
} from "@/modules/commercial/commercial-post-activation-due-work-deferral-query.service";
import {
  listCommercialPostActivationMonitoring,
  type ListCommercialPostActivationMonitoringInput,
} from "@/modules/commercial/commercial-post-activation-monitoring-query.service";
import {
  queryCommercialPostActivationProjectionAudit,
  type QueryCommercialPostActivationProjectionAuditResult,
} from "@/modules/commercial/commercial-post-activation-due-work-projection-audit-query.service";
import {
  getCommercialPostActivationRunnerMetrics,
  type CommercialPostActivationRunnerMetricsSnapshot,
} from "@/modules/commercial/commercial-post-activation-runner-metrics-query.service";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type AlertData = Extract<
  ListCommercialPostActivationAlertsResult,
  { ok: true }
>["data"];

type HistoryData = Extract<
  ListCommercialPostActivationAlertHistoryResult,
  { ok: true }
>["data"];
type SlaSignalData = Extract<
  ListCommercialPostActivationAlertSlaSignalsResult,
  { ok: true }
>["data"];

type SlaData = Extract<
  ListCommercialPostActivationAlertSlaResult,
  { ok: true }
>["data"];
type DueWorkData = Extract<
  GetCommercialPostActivationDueWorkSnapshotResult,
  { ok: true }
>["data"];
type DueWorkDeferralData = Extract<
  ListCommercialPostActivationDueWorkDeferralsResult,
  { ok: true }
>["data"];
type ProjectionAuditData = Extract<
  QueryCommercialPostActivationProjectionAuditResult,
  { ok: true }
>["data"];
type DueWorkDeferralInput = {
  state?: "all" | "waiting" | "escalated";
  limit?: number;
  offset?: number;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PlatformPostActivationPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawStatus = first(params.status);
  const rawLimit = first(params.limit);
  const rawHistoryAction = first(params.historyAction);
  const rawHistoryActorType = first(params.historyActorType);
  const rawHistoryLimit = first(params.historyLimit);
  const rawHistoryCursor = first(params.historyCursor);
  const rawSlaSeverity = first(params.slaSeverity);
  const rawSlaLifecycle = first(params.slaLifecycle);
  const rawSlaBreach = first(params.slaBreach);
  const rawSlaLimit = first(params.slaLimit);
  const rawSlaOffset = first(params.slaOffset);
  const rawSlaSignalSeverity = first(params.slaSignalSeverity);
  const rawSlaSignalType = first(params.slaSignalType);
  const rawSlaSignalLimit = first(params.slaSignalLimit);
  const rawDueDeferralState = first(params.dueDeferralState);
  const rawDueDeferralLimit = first(params.dueDeferralLimit);
  const rawDueDeferralOffset = first(params.dueDeferralOffset);
  const input = {
    status: rawStatus || undefined,
    limit: rawLimit ? Number(rawLimit) : undefined,
  } as ListCommercialPostActivationMonitoringInput;
  const historyInput = {
    action: rawHistoryAction || undefined,
    actorType: rawHistoryActorType || undefined,
    limit: rawHistoryLimit ? Number(rawHistoryLimit) : undefined,
    cursor: rawHistoryCursor || undefined,
  } as ListCommercialPostActivationAlertHistoryInput;
  const slaInput = {
    severity: rawSlaSeverity || undefined,
    lifecycle: rawSlaLifecycle || undefined,
    breach: rawSlaBreach || undefined,
    limit: rawSlaLimit ? Number(rawSlaLimit) : undefined,
    offset: rawSlaOffset ? Number(rawSlaOffset) : undefined,
  } as ListCommercialPostActivationAlertSlaInput;
  const slaSignalInput = {
    severity: rawSlaSignalSeverity || undefined,
    type: rawSlaSignalType || undefined,
    limit: rawSlaSignalLimit ? Number(rawSlaSignalLimit) : undefined,
  } as ListCommercialPostActivationAlertSlaSignalsInput;
  const dueDeferralInput: DueWorkDeferralInput = {
    state: (rawDueDeferralState || undefined) as DueWorkDeferralInput["state"],
    limit: rawDueDeferralLimit ? Number(rawDueDeferralLimit) : undefined,
    offset: rawDueDeferralOffset ? Number(rawDueDeferralOffset) : undefined,
  };

  let result;
  try {
    result = await listCommercialPostActivationMonitoring(input);
  } catch (error) {
    console.error("PLATFORM POST-ACTIVATION PAGE ERROR:", error);
    return <MonitoringError message="Não foi possível carregar o monitoramento agora." />;
  }

  if (result.ok === false) {
    return <MonitoringError message={result.message} />;
  }

  let alertData: AlertData | null = null;
  try {
    const alerts = await listCommercialPostActivationAlerts({ limit: 10 });
    if (alerts.ok) alertData = alerts.data;
  } catch (error) {
    console.error("PLATFORM POST-ACTIVATION ALERTS ERROR:", error);
  }

  let historyData: HistoryData | null = null;
  try {
    const history = await listCommercialPostActivationAlertHistory(historyInput);
    if (history.ok) historyData = history.data;
  } catch (error) {
    console.error("PLATFORM POST-ACTIVATION ALERT HISTORY ERROR:", error);
  }

  let runnerMetrics: CommercialPostActivationRunnerMetricsSnapshot | null = null;
  try {
    const runner = await getCommercialPostActivationRunnerMetrics();
    if (runner.ok) runnerMetrics = runner.data;
  } catch (error) {
    console.error("PLATFORM POST-ACTIVATION RUNNER METRICS ERROR:", error);
  }

  let projectionAuditData: ProjectionAuditData | null = null;
  try {
    const projectionAudit = await queryCommercialPostActivationProjectionAudit();
    if (projectionAudit.ok) projectionAuditData = projectionAudit.data;
  } catch (error) {
    console.error("PLATFORM POST-ACTIVATION PROJECTION AUDIT ERROR:", error);
  }

  let dueWorkData: DueWorkData | null = null;
  try {
    const dueWork = await getCommercialPostActivationDueWorkSnapshot();
    if (dueWork.ok) dueWorkData = dueWork.data;
  } catch (error) {
    console.error("PLATFORM POST-ACTIVATION DUE WORK ERROR:", error);
  }

  let dueWorkDeferralData: DueWorkDeferralData | null = null;
  try {
    const deferrals = await listCommercialPostActivationDueWorkDeferrals(dueDeferralInput);
    if (deferrals.ok) dueWorkDeferralData = deferrals.data;
  } catch (error) {
    console.error("PLATFORM POST-ACTIVATION DUE WORK DEFERRALS ERROR:", error);
  }

  let slaData: SlaData | null = null;
  try {
    const sla = await listCommercialPostActivationAlertSla(slaInput);
    if (sla.ok) slaData = sla.data;
  } catch (error) {
    console.error("PLATFORM POST-ACTIVATION ALERT SLA ERROR:", error);
  }
  let slaSignalData: SlaSignalData | null = null;
  try {
    const signals = await listCommercialPostActivationAlertSlaSignals(slaSignalInput);
    if (signals.ok) slaSignalData = signals.data;
  } catch (error) {
    console.error("PLATFORM POST-ACTIVATION ALERT SLA SIGNALS ERROR:", error);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Controle interno Flaience</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
            Acompanhamento pós-ativação
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Monitore automações, prazos, evidências e exceções operacionais dos clientes ativados.
          </p>
        </div>

        <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-[180px_100px_auto]" method="get">
          {historyInput.action ? (
            <input type="hidden" name="historyAction" value={historyInput.action} />
          ) : null}
          {historyInput.actorType ? (
            <input type="hidden" name="historyActorType" value={historyInput.actorType} />
          ) : null}
          {historyInput.limit ? (
            <input type="hidden" name="historyLimit" value={historyInput.limit} />
          ) : null}
          {historyInput.cursor ? (
            <input type="hidden" name="historyCursor" value={historyInput.cursor} />
          ) : null}
          {slaInput.severity ? (
            <input type="hidden" name="slaSeverity" value={slaInput.severity} />
          ) : null}
          {slaInput.lifecycle ? (
            <input type="hidden" name="slaLifecycle" value={slaInput.lifecycle} />
          ) : null}
          {slaInput.breach ? (
            <input type="hidden" name="slaBreach" value={slaInput.breach} />
          ) : null}
          {slaInput.limit ? (
            <input type="hidden" name="slaLimit" value={slaInput.limit} />
          ) : null}
          {slaInput.offset ? (
            <input type="hidden" name="slaOffset" value={slaInput.offset} />
          ) : null}
          {slaSignalInput.severity ? (
            <input type="hidden" name="slaSignalSeverity" value={slaSignalInput.severity} />
          ) : null}
          {slaSignalInput.type ? (
            <input type="hidden" name="slaSignalType" value={slaSignalInput.type} />
          ) : null}
          {slaSignalInput.limit ? (
            <input type="hidden" name="slaSignalLimit" value={slaSignalInput.limit} />
          ) : null}
          {dueDeferralInput.state && dueDeferralInput.state !== "all" ? (
            <input type="hidden" name="dueDeferralState" value={dueDeferralInput.state} />
          ) : null}
          {dueDeferralInput.limit ? (
            <input type="hidden" name="dueDeferralLimit" value={dueDeferralInput.limit} />
          ) : null}
          {dueDeferralInput.offset ? (
            <input type="hidden" name="dueDeferralOffset" value={dueDeferralInput.offset} />
          ) : null}
          <label className="text-xs font-medium text-slate-600">
            Situação
            <select
              name="status"
              defaultValue={input.status ?? ""}
              className="mt-1 block h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
            >
              <option value="">Todas</option>
              <option value="escalated">Escalonados</option>
              <option value="overdue">Atrasados</option>
              <option value="waiting">Aguardando</option>
              <option value="scheduled">Agendados</option>
              <option value="completed">Concluídos</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Limite
            <input
              name="limit"
              type="number"
              min={1}
              max={100}
              defaultValue={input.limit ?? 25}
              className="mt-1 block h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800"
            />
          </label>
          <button
            type="submit"
            className="self-end rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Aplicar
          </button>
        </form>
      </header>

      <PostActivationRunnerHealthPanel data={runnerMetrics} />
      <PostActivationProjectionAuditPanel data={projectionAuditData} />
      <PostActivationDueWorkPanel data={dueWorkData} />
      <PostActivationDueWorkDeferralPanel
        data={dueWorkDeferralData}
        filters={dueDeferralInput}
        preservedFilters={{
          status: input.status,
          limit: input.limit,
          historyAction: historyInput.action,
          historyActorType: historyInput.actorType,
          historyLimit: historyInput.limit,
          historyCursor: historyInput.cursor,
          slaSeverity: slaInput.severity,
          slaLifecycle: slaInput.lifecycle,
          slaBreach: slaInput.breach,
          slaLimit: slaInput.limit,
          slaOffset: slaInput.offset,
          slaSignalSeverity: slaSignalInput.severity,
          slaSignalType: slaSignalInput.type,
          slaSignalLimit: slaSignalInput.limit,
        }}
      />
      <PostActivationAlertPanel data={alertData} />
      <PostActivationAlertSlaPanel
        data={slaData}
        filters={slaInput}
        preservedFilters={{
          status: input.status,
          limit: input.limit,
          historyAction: historyInput.action,
          historyActorType: historyInput.actorType,
          historyLimit: historyInput.limit,
          historyCursor: historyInput.cursor,
          dueDeferralState: dueDeferralInput.state,
          dueDeferralLimit: dueDeferralInput.limit,
          dueDeferralOffset: dueDeferralInput.offset,
        }}
      />
      <PostActivationAlertSlaSignalsPanel
        data={slaSignalData}
        filters={slaSignalInput}
        preservedFilters={{
          status: input.status,
          limit: input.limit,
          historyAction: historyInput.action,
          historyActorType: historyInput.actorType,
          historyLimit: historyInput.limit,
          historyCursor: historyInput.cursor,
          slaSeverity: slaInput.severity,
          slaLifecycle: slaInput.lifecycle,
          slaBreach: slaInput.breach,
          slaLimit: slaInput.limit,
          slaOffset: slaInput.offset,
          dueDeferralState: dueDeferralInput.state,
          dueDeferralLimit: dueDeferralInput.limit,
          dueDeferralOffset: dueDeferralInput.offset,
        }}
      />
      <PostActivationMonitoringDashboard data={result.data} />
      <PostActivationAlertHistoryPanel
        data={historyData}
        filters={historyInput}
        preservedMonitoringFilters={input}
      />
    </div>
  );
}

function MonitoringError({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6" role="alert">
      <h2 className="font-semibold text-rose-900">Monitoramento indisponível</h2>
      <p className="mt-2 text-sm text-rose-700">{message}</p>
      <a
        href="/platform/commercial/post-activation"
        className="mt-4 inline-flex rounded-xl bg-rose-900 px-4 py-2 text-sm font-medium text-white"
      >
        Tentar novamente
      </a>
    </div>
  );
}
