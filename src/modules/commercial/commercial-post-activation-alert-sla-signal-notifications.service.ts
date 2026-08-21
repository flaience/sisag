import { z } from "zod";

const signalSchema = z.object({
  key: z.string().trim().min(1).max(600),
  alertKey: z.string().trim().min(1).max(500),
  type: z.enum(["acknowledgement_breached", "resolution_breached"]),
  severity: z.enum(["critical", "high"]),
  priority: z.enum(["critical", "high"]),
  elapsedMinutes: z.number().int().nonnegative(),
  targetMinutes: z.number().int().positive(),
  overdueMinutes: z.number().int().nonnegative(),
});

const inputSchema = z.object({
  signals: z.array(signalSchema).max(1000),
});

export type CommercialPostActivationAlertSlaSignalNotification = {
  key: string;
  dedupeKey: string;
  eventType: "commercial.post_activation.alert_sla_breached";
  aggregateType: "commercial_post_activation_alert";
  aggregateKey: string;
  payload: {
    signalKey: string;
    alertKey: string;
    breachType: "acknowledgement_breached" | "resolution_breached";
    severity: "critical" | "high";
    priority: "critical" | "high";
    elapsedMinutes: number;
    targetMinutes: number;
    overdueMinutes: number;
  };
};

export type ProjectCommercialPostActivationAlertSlaSignalNotificationsResult =
  | {
      ok: false;
      error: "invalid_input";
      message: string;
    }
  | {
      ok: true;
      data: {
        notifications: CommercialPostActivationAlertSlaSignalNotification[];
        summary: {
          total: number;
          critical: number;
          high: number;
        };
      };
    };

const eventType = "commercial.post_activation.alert_sla_breached" as const;

export function projectCommercialPostActivationAlertSlaSignalNotifications(
  rawInput: unknown,
): ProjectCommercialPostActivationAlertSlaSignalNotificationsResult {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid_input",
      message: "Dados para notificação dos sinais de SLA inválidos.",
    };
  }

  const notifications = parsed.data.signals.map<CommercialPostActivationAlertSlaSignalNotification>(
    (signal) => {
      const dedupeKey = `${eventType}:${signal.key}`;
      return {
        key: dedupeKey,
        dedupeKey,
        eventType,
        aggregateType: "commercial_post_activation_alert",
        aggregateKey: signal.alertKey,
        payload: {
          signalKey: signal.key,
          alertKey: signal.alertKey,
          breachType: signal.type,
          severity: signal.severity,
          priority: signal.priority,
          elapsedMinutes: signal.elapsedMinutes,
          targetMinutes: signal.targetMinutes,
          overdueMinutes: signal.overdueMinutes,
        },
      };
    },
  );

  return {
    ok: true,
    data: {
      notifications,
      summary: {
        total: notifications.length,
        critical: notifications.filter((item) => item.payload.priority === "critical").length,
        high: notifications.filter((item) => item.payload.priority === "high").length,
      },
    },
  };
}
