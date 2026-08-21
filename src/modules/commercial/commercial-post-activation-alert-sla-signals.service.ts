import { z } from "zod";

const itemSchema = z.object({
  alertKey: z.string().trim().min(1).max(500),
  severity: z.enum(["critical", "high"]),
  lifecycle: z.enum(["new", "acknowledged", "resolved"]),
  acknowledgementMinutes: z.number().int().nonnegative(),
  resolutionMinutes: z.number().int().nonnegative(),
  acknowledgementTargetMinutes: z.number().int().positive(),
  resolutionTargetMinutes: z.number().int().positive(),
  acknowledgementBreached: z.boolean(),
  resolutionBreached: z.boolean(),
});

const inputSchema = z.object({
  items: z.array(itemSchema).max(1000),
});

export type CommercialPostActivationAlertSlaSignal = {
  key: string;
  alertKey: string;
  type: "acknowledgement_breached" | "resolution_breached";
  severity: "critical" | "high";
  priority: "critical" | "high";
  elapsedMinutes: number;
  targetMinutes: number;
  overdueMinutes: number;
};

export type ProjectCommercialPostActivationAlertSlaSignalsResult =
  | { ok: false; error: "invalid_input"; message: string }
  | {
      ok: true;
      data: {
        signals: CommercialPostActivationAlertSlaSignal[];
        summary: {
          total: number;
          critical: number;
          acknowledgementBreached: number;
          resolutionBreached: number;
        };
      };
    };

export function projectCommercialPostActivationAlertSlaSignals(
  rawInput: unknown,
): ProjectCommercialPostActivationAlertSlaSignalsResult {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Dados dos sinais de SLA dos alertas pós-ativação inválidos.",
    };
  }

  const signals = parsed.data.items.flatMap<CommercialPostActivationAlertSlaSignal>((item) => {
    if (item.lifecycle === "resolved") return [];
    const projected: CommercialPostActivationAlertSlaSignal[] = [];
    if (item.lifecycle === "new" && item.acknowledgementBreached) {
      projected.push({
        key: `${item.alertKey}:sla_acknowledgement_breached`,
        alertKey: item.alertKey,
        type: "acknowledgement_breached",
        severity: item.severity,
        priority: item.severity,
        elapsedMinutes: item.acknowledgementMinutes,
        targetMinutes: item.acknowledgementTargetMinutes,
        overdueMinutes: Math.max(0, item.acknowledgementMinutes - item.acknowledgementTargetMinutes),
      });
    }
    if (item.resolutionBreached) {
      projected.push({
        key: `${item.alertKey}:sla_resolution_breached`,
        alertKey: item.alertKey,
        type: "resolution_breached",
        severity: item.severity,
        priority: item.severity,
        elapsedMinutes: item.resolutionMinutes,
        targetMinutes: item.resolutionTargetMinutes,
        overdueMinutes: Math.max(0, item.resolutionMinutes - item.resolutionTargetMinutes),
      });
    }
    return projected;
  }).sort((left, right) => (
    Number(right.priority === "critical") - Number(left.priority === "critical")
    || left.key.localeCompare(right.key)
  ));

  return { ok: true, data: {
    signals,
    summary: {
      total: signals.length,
      critical: signals.filter((item) => item.priority === "critical").length,
      acknowledgementBreached: signals.filter((item) => item.type === "acknowledgement_breached").length,
      resolutionBreached: signals.filter((item) => item.type === "resolution_breached").length,
    },
  } };
}
