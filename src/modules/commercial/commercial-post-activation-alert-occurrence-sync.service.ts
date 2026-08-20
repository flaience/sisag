import {
  listCommercialPostActivationAlertHistory,
  type ListCommercialPostActivationAlertHistoryResult,
} from "./commercial-post-activation-alert-history.service";
import {
  listCommercialPostActivationAlerts,
  type ListCommercialPostActivationAlertsResult,
} from "./commercial-post-activation-alert-query.service";
import {
  synchronizeCommercialPostActivationAlertOccurrences,
  type SynchronizeCommercialPostActivationAlertOccurrencesResult,
} from "./commercial-post-activation-alert-occurrences.service";

type ListAlerts = (
  input: { limit: number },
) => Promise<ListCommercialPostActivationAlertsResult>;

type ListHistory = (
  input: { action: "resolved"; limit: number },
) => Promise<ListCommercialPostActivationAlertHistoryResult>;

type Synchronize = (
  input: { alerts: unknown[]; actions: unknown[] },
  options: { now?: () => Date },
) => Promise<SynchronizeCommercialPostActivationAlertOccurrencesResult>;

export type SynchronizeCommercialPostActivationAlertOccurrenceRegistryResult =
  | {
      ok: false;
      error: "alert_query_failed" | "history_query_failed" | "synchronization_failed";
      message: string;
    }
  | {
      ok: true;
      activeAlerts: number;
      resolvedActions: number;
      observed: number;
      resolved: number;
      replayedResolutions: number;
      missingOccurrences: number;
      invalidRecords: number;
      historyTruncated: boolean;
    };

export async function synchronizeCommercialPostActivationAlertOccurrenceRegistry(
  options: {
    listAlerts?: ListAlerts;
    listHistory?: ListHistory;
    synchronize?: Synchronize;
    now?: () => Date;
  } = {},
): Promise<SynchronizeCommercialPostActivationAlertOccurrenceRegistryResult> {
  const alerts = await (options.listAlerts ?? listCommercialPostActivationAlerts)({
    limit: 100,
  });
  if (alerts.ok === false) {
    return {
      ok: false,
      error: "alert_query_failed",
      message: "Não foi possível coletar os alertas pós-ativação.",
    };
  }

  const history = await (
    options.listHistory ?? listCommercialPostActivationAlertHistory
  )({ action: "resolved", limit: 100 });
  if (history.ok === false) {
    return {
      ok: false,
      error: "history_query_failed",
      message: "Não foi possível coletar as resoluções dos alertas pós-ativação.",
    };
  }

  const activeAlerts = alerts.data.alerts.map((alert) => ({
    key: alert.key,
    severity: alert.severity,
    category: alert.category,
    onboardingId: alert.onboardingId,
    commercialClientId: alert.commercialClientId,
  }));
  const result = await (
    options.synchronize ?? synchronizeCommercialPostActivationAlertOccurrences
  )({
    alerts: activeAlerts,
    actions: history.data.items,
  }, { now: options.now });
  if (result.ok === false) {
    return {
      ok: false,
      error: "synchronization_failed",
      message: "Não foi possível sincronizar as ocorrências dos alertas pós-ativação.",
    };
  }

  return {
    ok: true,
    activeAlerts: activeAlerts.length,
    resolvedActions: history.data.items.length,
    observed: result.observed,
    resolved: result.resolved,
    replayedResolutions: result.replayedResolutions,
    missingOccurrences: result.missingOccurrences,
    invalidRecords: alerts.data.invalidRecords + history.data.invalidRecords,
    historyTruncated: history.data.nextCursor !== null,
  };
}
