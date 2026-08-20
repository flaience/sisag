import { describe, expect, it } from "vitest";

import { projectCommercialPostActivationAlertSla } from "./commercial-post-activation-alert-sla.service";

const openedAt = "2026-08-20T12:00:00.000Z";
const alert = (overrides: Record<string, unknown> = {}) => ({
  key: "onboarding-1:milestone_overdue:adoption_d1",
  severity: "high",
  openedAt,
  ...overrides,
});
const action = (
  actionName: "acknowledged" | "resolved",
  actedAt: string,
) => ({
  idempotencyKey: `${actionName}-${actedAt}`,
  alertKey: "onboarding-1:milestone_overdue:adoption_d1",
  action: actionName,
  actor: { type: "human", id: "operator-1" },
  actedAt,
});

describe("commercial post-activation alert SLA", () => {
  it("projects an open alert within both SLA targets", () => {
    const result = projectCommercialPostActivationAlertSla({
      alerts: [alert()],
      actions: [],
    }, { now: () => new Date("2026-08-20T13:00:00.000Z") });

    expect(result).toEqual({
      ok: true,
      data: {
        items: [{
          alertKey: "onboarding-1:milestone_overdue:adoption_d1",
          severity: "high",
          lifecycle: "new",
          openedAt,
          acknowledgedAt: null,
          resolvedAt: null,
          acknowledgementMinutes: 60,
          resolutionMinutes: 60,
          acknowledgementTargetMinutes: 120,
          resolutionTargetMinutes: 1440,
          acknowledgementBreached: false,
          resolutionBreached: false,
        }],
        summary: {
          total: 1,
          open: 1,
          acknowledged: 0,
          resolved: 0,
          acknowledgementBreached: 0,
          resolutionBreached: 0,
          withinSla: 1,
          complianceRate: 100,
        },
      },
    });
  });

  it("freezes acknowledgement time and continues resolution time", () => {
    const result = projectCommercialPostActivationAlertSla({
      alerts: [alert()],
      actions: [action("acknowledged", "2026-08-20T13:30:00.000Z")],
    }, { now: () => new Date("2026-08-20T16:00:00.000Z") });

    expect(result).toMatchObject({
      ok: true,
      data: {
        items: [{
          lifecycle: "acknowledged",
          acknowledgementMinutes: 90,
          resolutionMinutes: 240,
          acknowledgementBreached: false,
          resolutionBreached: false,
        }],
        summary: { open: 1, acknowledged: 1, resolved: 0 },
      },
    });
  });

  it("projects breached critical targets for a resolved alert", () => {
    const result = projectCommercialPostActivationAlertSla({
      alerts: [alert({ severity: "critical" })],
      actions: [
        action("acknowledged", "2026-08-20T12:45:00.000Z"),
        action("resolved", "2026-08-20T17:00:00.000Z"),
      ],
    }, { now: () => new Date("2026-08-20T18:00:00.000Z") });

    expect(result).toMatchObject({
      ok: true,
      data: {
        items: [{
          severity: "critical",
          lifecycle: "resolved",
          acknowledgementMinutes: 45,
          resolutionMinutes: 300,
          acknowledgementTargetMinutes: 30,
          resolutionTargetMinutes: 240,
          acknowledgementBreached: true,
          resolutionBreached: true,
        }],
        summary: {
          total: 1,
          open: 0,
          resolved: 1,
          acknowledgementBreached: 1,
          resolutionBreached: 1,
          withinSla: 0,
          complianceRate: 0,
        },
      },
    });
  });

  it("treats direct resolution as the effective acknowledgement", () => {
    const result = projectCommercialPostActivationAlertSla({
      alerts: [alert()],
      actions: [action("resolved", "2026-08-20T13:00:00.000Z")],
    }, { now: () => new Date("2026-08-20T18:00:00.000Z") });

    expect(result).toMatchObject({
      ok: true,
      data: {
        items: [{
          lifecycle: "resolved",
          acknowledgedAt: null,
          resolvedAt: "2026-08-20T13:00:00.000Z",
          acknowledgementMinutes: 60,
          resolutionMinutes: 60,
          acknowledgementBreached: false,
        }],
      },
    });
  });

  it("supports explicit SLA targets", () => {
    const result = projectCommercialPostActivationAlertSla({
      alerts: [alert()],
      actions: [],
    }, {
      now: () => new Date("2026-08-20T13:00:00.000Z"),
      targets: {
        high: { acknowledgementMinutes: 30, resolutionMinutes: 45 },
      },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        items: [{
          acknowledgementTargetMinutes: 30,
          resolutionTargetMinutes: 45,
          acknowledgementBreached: true,
          resolutionBreached: true,
        }],
      },
    });
  });

  it("rejects actions that predate the alert", () => {
    const result = projectCommercialPostActivationAlertSla({
      alerts: [alert()],
      actions: [action("acknowledged", "2026-08-20T11:59:00.000Z")],
    });

    expect(result).toEqual({
      ok: false,
      error: "invalid_input",
      message: "Uma ação de alerta não pode ocorrer antes da abertura.",
    });
  });

  it("rejects malformed input without exposing validation internals", () => {
    expect(projectCommercialPostActivationAlertSla({
      alerts: [{ ...alert(), openedAt: "invalid" }],
      actions: [],
    })).toEqual({
      ok: false,
      error: "invalid_input",
      message: "Dados de SLA dos alertas pós-ativação inválidos.",
    });
  });
});
