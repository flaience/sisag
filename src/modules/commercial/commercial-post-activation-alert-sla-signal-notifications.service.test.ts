import { describe, expect, it } from "vitest";

import { projectCommercialPostActivationAlertSlaSignalNotifications } from "./commercial-post-activation-alert-sla-signal-notifications.service";

const resolutionSignal = {
  key: "alert-1:sla_resolution_breached",
  alertKey: "alert-1",
  type: "resolution_breached" as const,
  severity: "critical" as const,
  priority: "critical" as const,
  elapsedMinutes: 300,
  targetMinutes: 240,
  overdueMinutes: 60,
};

describe("commercial post-activation alert SLA signal notifications", () => {
  it("projects an idempotent notification intent for each actionable signal", () => {
    expect(projectCommercialPostActivationAlertSlaSignalNotifications({
      signals: [resolutionSignal],
    })).toEqual({
      ok: true,
      data: {
        notifications: [{
          key: "commercial.post_activation.alert_sla_breached:alert-1:sla_resolution_breached",
          dedupeKey: "commercial.post_activation.alert_sla_breached:alert-1:sla_resolution_breached",
          eventType: "commercial.post_activation.alert_sla_breached",
          aggregateType: "commercial_post_activation_alert",
          aggregateKey: "alert-1",
          payload: {
            signalKey: resolutionSignal.key,
            alertKey: "alert-1",
            breachType: "resolution_breached",
            severity: "critical",
            priority: "critical",
            elapsedMinutes: 300,
            targetMinutes: 240,
            overdueMinutes: 60,
          },
        }],
        summary: { total: 1, critical: 1, high: 0 },
      },
    });
  });

  it("uses the signal key to preserve the same dedupe key on replay", () => {
    const first = projectCommercialPostActivationAlertSlaSignalNotifications({
      signals: [resolutionSignal],
    });
    const replay = projectCommercialPostActivationAlertSlaSignalNotifications({
      signals: [{ ...resolutionSignal, elapsedMinutes: 315, overdueMinutes: 75 }],
    });

    expect(first.ok && first.data.notifications[0]?.dedupeKey).toBe(
      replay.ok && replay.data.notifications[0]?.dedupeKey,
    );
  });

  it("distinguishes acknowledgement and resolution breaches", () => {
    const acknowledgementSignal = {
      ...resolutionSignal,
      key: "alert-2:sla_acknowledgement_breached",
      alertKey: "alert-2",
      type: "acknowledgement_breached" as const,
      severity: "high" as const,
      priority: "high" as const,
      elapsedMinutes: 150,
      targetMinutes: 120,
      overdueMinutes: 30,
    };
    const result = projectCommercialPostActivationAlertSlaSignalNotifications({
      signals: [resolutionSignal, acknowledgementSignal],
    });

    expect(result.ok && result.data.notifications.map((item) => item.payload.breachType))
      .toEqual(["resolution_breached", "acknowledgement_breached"]);
    expect(result.ok && result.data.summary).toEqual({ total: 2, critical: 1, high: 1 });
  });

  it("accepts an empty actionable set", () => {
    expect(projectCommercialPostActivationAlertSlaSignalNotifications({ signals: [] }))
      .toEqual({
        ok: true,
        data: {
          notifications: [],
          summary: { total: 0, critical: 0, high: 0 },
        },
      });
  });

  it("rejects malformed signals", () => {
    expect(projectCommercialPostActivationAlertSlaSignalNotifications({
      signals: [{ ...resolutionSignal, overdueMinutes: -1 }],
    })).toEqual({
      ok: false,
      error: "invalid_input",
      message: "Dados para notificação dos sinais de SLA inválidos.",
    });
  });
});
