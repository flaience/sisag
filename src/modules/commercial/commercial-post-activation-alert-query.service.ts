import { inArray } from "drizzle-orm";
import { z } from "zod";

import { commercialOnboardings } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

import {
  projectCommercialPostActivationAlertLifecycle,
  type CommercialPostActivationActionableAlert,
} from "./commercial-post-activation-alert-lifecycle.service";
import {
  buildCommercialPostActivationAlerts,
  type CommercialPostActivationAlert,
} from "./commercial-post-activation-alerts.service";
import {
  listCommercialPostActivationMonitoring,
  type ListCommercialPostActivationMonitoringResult,
} from "./commercial-post-activation-monitoring-query.service";

const inputSchema = z.object({
  severity: z.enum(["critical", "high"]).optional(),
  category: z.enum(["human_escalation", "milestone_overdue"]).optional(),
  limit: z.number().int().positive().max(100).default(25),
});

type ListMonitoring = (
  input: { limit?: number },
) => Promise<ListCommercialPostActivationMonitoringResult>;

type ListActions = (
  onboardingIds: string[],
) => Promise<unknown[]>;

export type ListCommercialPostActivationAlertsInput = {
  severity?: CommercialPostActivationAlert["severity"];
  category?: CommercialPostActivationAlert["category"];
  limit?: number;
};

export type ListCommercialPostActivationAlertsResult =
  | {
      ok: false;
      error:
        | "invalid_input"
        | "monitoring_unavailable"
        | "invalid_monitoring_data"
        | "invalid_action_history";
      message: string;
    }
  | {
      ok: true;
      data: {
        alerts: CommercialPostActivationActionableAlert[];
        summary: { critical: number; high: number; new: number; acknowledged: number; resolved: number; total: number };
        invalidRecords: number;
      };
    };

export async function listCommercialPostActivationAlerts(
  rawInput: ListCommercialPostActivationAlertsInput = {},
  options: { listMonitoring?: ListMonitoring; listActions?: ListActions } = {},
): Promise<ListCommercialPostActivationAlertsResult> {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "Consulta de alertas inválida.",
    };
  }

  const monitoring = await (options.listMonitoring ?? listCommercialPostActivationMonitoring)({
    limit: 100,
  });
  if (monitoring.ok === false) {
    return {
      ok: false,
      error: "monitoring_unavailable",
      message: "Não foi possível consultar o monitoramento pós-ativação.",
    };
  }

  const built = buildCommercialPostActivationAlerts(monitoring.data.items);
  if (built.ok === false) {
    return {
      ok: false,
      error: "invalid_monitoring_data",
      message: "O monitoramento retornou dados inválidos para alertas.",
    };
  }

  const filteredAlerts = built.data.alerts.filter((alert) => (
    (!parsed.data.severity || alert.severity === parsed.data.severity)
    && (!parsed.data.category || alert.category === parsed.data.category)
  ));
  const onboardingIds = [...new Set(filteredAlerts.map((alert) => alert.onboardingId))];
  const actions = await (options.listActions ?? listCommercialPostActivationAlertActions)(
    onboardingIds,
  );
  const projected = projectCommercialPostActivationAlertLifecycle({
    alerts: filteredAlerts,
    actions,
  });
  if (projected.ok === false) {
    return {
      ok: false,
      error: "invalid_action_history",
      message: "O histórico de ações dos alertas pós-ativação é inválido.",
    };
  }

  const alerts = projected.data.alerts.slice(0, parsed.data.limit);
  const critical = alerts.filter((alert) => alert.severity === "critical").length;
  const high = alerts.length - critical;
  const acknowledged = alerts.filter((alert) => alert.lifecycle === "acknowledged").length;

  return {
    ok: true,
    data: {
      alerts,
      summary: {
        critical,
        high,
        new: alerts.length - acknowledged,
        acknowledged,
        resolved: projected.data.summary.resolved,
        total: alerts.length,
      },
      invalidRecords: monitoring.data.invalidRecords,
    },
  };
}

async function listCommercialPostActivationAlertActions(
  onboardingIds: string[],
): Promise<unknown[]> {
  if (onboardingIds.length === 0) return [];

  const rows = await getDb().select({
    result: commercialOnboardings.result,
  }).from(commercialOnboardings)
    .where(inArray(commercialOnboardings.id, onboardingIds));

  return rows.flatMap((row) => {
    const result = (row.result ?? {}) as Record<string, unknown>;
    return Array.isArray(result.postActivationAlertActions)
      ? result.postActivationAlertActions
      : [];
  });
}
