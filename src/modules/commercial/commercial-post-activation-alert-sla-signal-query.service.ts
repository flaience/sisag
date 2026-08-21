import { z } from "zod";

import { listCommercialPostActivationAlertSla } from "./commercial-post-activation-alert-sla-query.service";
import {
  projectCommercialPostActivationAlertSlaSignals,
  type CommercialPostActivationAlertSlaSignal,
} from "./commercial-post-activation-alert-sla-signals.service";

const inputSchema = z.object({
  severity: z.enum(["critical", "high"]).optional(),
  type: z.enum(["acknowledgement_breached", "resolution_breached"]).optional(),
  limit: z.number().int().positive().max(100).default(25),
});

type SignalSummary = {
  total: number;
  critical: number;
  acknowledgementBreached: number;
  resolutionBreached: number;
};

export type ListCommercialPostActivationAlertSlaSignalsInput = {
  severity?: "critical" | "high";
  type?: "acknowledgement_breached" | "resolution_breached";
  limit?: number;
};

export type ListCommercialPostActivationAlertSlaSignalsResult =
  | {
      ok: false;
      error: "invalid_input" | "invalid_sla_data" | "invalid_signal_data";
      message: string;
    }
  | {
      ok: true;
      data: {
        signals: CommercialPostActivationAlertSlaSignal[];
        summary: SignalSummary;
        sourceInvalidRecords: number;
      };
    };

export async function listCommercialPostActivationAlertSlaSignals(
  options: ListCommercialPostActivationAlertSlaSignalsInput & {
    querySla?: typeof listCommercialPostActivationAlertSla;
    projectSignals?: typeof projectCommercialPostActivationAlertSlaSignals;
  } = {},
): Promise<ListCommercialPostActivationAlertSlaSignalsResult> {
  const input = inputSchema.safeParse(options);
  if (!input.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Filtros dos sinais de SLA dos alertas inválidos.",
    };
  }

  const querySla = options.querySla ?? listCommercialPostActivationAlertSla;
  const sla = await querySla({ limit: 1000, offset: 0 });
  if (sla.ok === false) {
    return {
      ok: false,
      error: "invalid_sla_data",
      message: "Não foi possível consultar os dados de SLA para projetar os sinais.",
    };
  }

  const projectSignals = options.projectSignals ?? projectCommercialPostActivationAlertSlaSignals;
  const projected = projectSignals({ items: sla.data.items });
  if (projected.ok === false) {
    return {
      ok: false,
      error: "invalid_signal_data",
      message: "Não foi possível projetar os sinais de SLA dos alertas.",
    };
  }

  const filtered = projected.data.signals.filter((signal) => (
    (!input.data.severity || signal.severity === input.data.severity)
    && (!input.data.type || signal.type === input.data.type)
  ));
  const signals = filtered.slice(0, input.data.limit);

  return { ok: true, data: {
    signals,
    summary: {
      total: filtered.length,
      critical: filtered.filter((signal) => signal.priority === "critical").length,
      acknowledgementBreached: filtered.filter((signal) => signal.type === "acknowledgement_breached").length,
      resolutionBreached: filtered.filter((signal) => signal.type === "resolution_breached").length,
    },
    sourceInvalidRecords: sla.data.invalidRecords,
  } };
}
