import { z } from "zod";

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

export type ListCommercialPostActivationAlertsInput = {
  severity?: CommercialPostActivationAlert["severity"];
  category?: CommercialPostActivationAlert["category"];
  limit?: number;
};

export type ListCommercialPostActivationAlertsResult =
  | {
      ok: false;
      error: "invalid_input" | "monitoring_unavailable" | "invalid_monitoring_data";
      message: string;
    }
  | {
      ok: true;
      data: {
        alerts: CommercialPostActivationAlert[];
        summary: { critical: number; high: number; total: number };
        invalidRecords: number;
      };
    };

export async function listCommercialPostActivationAlerts(
  rawInput: ListCommercialPostActivationAlertsInput = {},
  options: { listMonitoring?: ListMonitoring } = {},
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

  const filtered = built.data.alerts.filter((alert) => (
    (!parsed.data.severity || alert.severity === parsed.data.severity)
    && (!parsed.data.category || alert.category === parsed.data.category)
  ));
  const alerts = filtered.slice(0, parsed.data.limit);
  const critical = alerts.filter((alert) => alert.severity === "critical").length;
  const high = alerts.length - critical;

  return {
    ok: true,
    data: {
      alerts,
      summary: { critical, high, total: alerts.length },
      invalidRecords: monitoring.data.invalidRecords,
    },
  };
}
