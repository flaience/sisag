import { describe, expect, it } from "vitest";

import type { CommercialPostActivationAlert } from "./commercial-post-activation-alerts.service";
import { projectCommercialPostActivationAlertLifecycle } from "./commercial-post-activation-alert-lifecycle.service";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const alert: CommercialPostActivationAlert = {
  key: `${onboardingId}:milestone_overdue:welcome`,
  severity: "high",
  category: "milestone_overdue",
  onboardingId,
  commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
  clientName: "Clínica Exemplo",
  planKey: `${onboardingId}:post_activation:2026-08-v1`,
  milestoneCode: "welcome",
  milestoneTitle: "Boas-vindas",
  ownerType: "agent",
  dueAt: "2026-08-13T12:00:00.000Z",
  reasons: ["welcome_delivered"],
  supportWindowExpired: false,
};

function action(
  value: "acknowledged" | "resolved",
  actedAt = "2026-08-15T12:00:00.000Z",
) {
  return {
    idempotencyKey: `action-${value}-${actedAt}`,
    alertKey: alert.key,
    action: value,
    actor: { type: "human" as const, id: "operator-1" },
    actedAt,
  };
}

describe("commercial post-activation alert lifecycle", () => {
  it("marks alerts without actions as new", () => {
    const result = projectCommercialPostActivationAlertLifecycle({ alerts: [alert], actions: [] });

    expect(result).toEqual({
      ok: true,
      data: {
        alerts: [{
          ...alert,
          lifecycle: "new",
          acknowledgedAt: null,
          acknowledgedBy: null,
        }],
        summary: {
          critical: 0,
          high: 1,
          new: 1,
          acknowledged: 0,
          resolved: 0,
          total: 1,
        },
      },
    });
  });

  it("projects the latest acknowledgement", () => {
    const latest = action("acknowledged", "2026-08-15T13:00:00.000Z");
    const result = projectCommercialPostActivationAlertLifecycle({
      alerts: [alert],
      actions: [latest, action("acknowledged", "2026-08-15T12:00:00.000Z")],
    });

    expect(result.ok && result.data.alerts[0]).toEqual(expect.objectContaining({
      lifecycle: "acknowledged",
      acknowledgedAt: latest.actedAt,
      acknowledgedBy: latest.actor,
    }));
    expect(result.ok && result.data.summary.acknowledged).toBe(1);
  });

  it("removes resolved alerts from the actionable collection", () => {
    const result = projectCommercialPostActivationAlertLifecycle({
      alerts: [alert],
      actions: [action("acknowledged"), action("resolved", "2026-08-15T14:00:00.000Z")],
    });

    expect(result).toEqual({
      ok: true,
      data: {
        alerts: [],
        summary: {
          critical: 0,
          high: 0,
          new: 0,
          acknowledged: 0,
          resolved: 1,
          total: 0,
        },
      },
    });
  });

  it("ignores actions belonging to alerts outside the active collection", () => {
    const result = projectCommercialPostActivationAlertLifecycle({
      alerts: [alert],
      actions: [{ ...action("resolved"), alertKey: `${onboardingId}:milestone_overdue:adoption_d7` }],
    });

    expect(result.ok && result.data.alerts[0]?.lifecycle).toBe("new");
    expect(result.ok && result.data.summary.resolved).toBe(0);
  });

  it("recalculates severity and lifecycle summaries", () => {
    const critical = { ...alert, key: `${onboardingId}:human_escalation:welcome`, severity: "critical" as const };
    const result = projectCommercialPostActivationAlertLifecycle({
      alerts: [alert, critical],
      actions: [{ ...action("acknowledged"), alertKey: critical.key }],
    });

    expect(result.ok && result.data.summary).toEqual({
      critical: 1,
      high: 1,
      new: 1,
      acknowledged: 1,
      resolved: 0,
      total: 2,
    });
  });

  it("rejects malformed lifecycle history", () => {
    expect(projectCommercialPostActivationAlertLifecycle({
      alerts: [alert],
      actions: [{ action: "unknown" }],
    })).toEqual({
      ok: false,
      error: "invalid_input",
      message: "Dados do ciclo de vida dos alertas são inválidos.",
    });
  });
});
