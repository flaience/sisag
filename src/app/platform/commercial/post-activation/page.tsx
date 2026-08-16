import { PostActivationAlertPanel } from "@/components/commercial/PostActivationAlertPanel";
import { PostActivationAlertHistoryPanel } from "@/components/commercial/PostActivationAlertHistoryPanel";
import { PostActivationMonitoringDashboard } from "@/components/commercial/PostActivationMonitoringDashboard";
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
  listCommercialPostActivationMonitoring,
  type ListCommercialPostActivationMonitoringInput,
} from "@/modules/commercial/commercial-post-activation-monitoring-query.service";

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
  const input = {
    status: rawStatus || undefined,
    limit: rawLimit ? Number(rawLimit) : undefined,
  } as ListCommercialPostActivationMonitoringInput;
  const historyInput = {
    action: rawHistoryAction || undefined,
    actorType: rawHistoryActorType || undefined,
    limit: rawHistoryLimit ? Number(rawHistoryLimit) : undefined,
  } as ListCommercialPostActivationAlertHistoryInput;

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

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Operação comercial</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
            Acompanhamento pós-ativação
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Acompanhe marcos, prazos, evidências e escalonamentos dos clientes ativados.
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

      <PostActivationAlertPanel data={alertData} />
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
