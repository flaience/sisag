import { describe, expect, it } from "vitest";
import { projectCommercialPostActivationAlertSlaSignals } from "./commercial-post-activation-alert-sla-signals.service";

const item = {
  alertKey: "onboarding-1:milestone_overdue:adoption_d1",
  severity: "high" as const,
  lifecycle: "new" as const,
  acknowledgementMinutes: 150,
  resolutionMinutes: 1500,
  acknowledgementTargetMinutes: 120,
  resolutionTargetMinutes: 1440,
  acknowledgementBreached: true,
  resolutionBreached: true,
};

describe("commercial post-activation alert SLA signals", () => {
  it("projects active acknowledgement and resolution breaches", () => {
    expect(projectCommercialPostActivationAlertSlaSignals({ items: [item] })).toEqual({
      ok: true,
      data: {
        signals: [
          {
            key: `${item.alertKey}:sla_acknowledgement_breached`,
            alertKey: item.alertKey,
            type: "acknowledgement_breached",
            severity: "high",
            priority: "high",
            elapsedMinutes: 150,
            targetMinutes: 120,
            overdueMinutes: 30,
          },
          {
            key: `${item.alertKey}:sla_resolution_breached`,
            alertKey: item.alertKey,
            type: "resolution_breached",
            severity: "high",
            priority: "high",
            elapsedMinutes: 1500,
            targetMinutes: 1440,
            overdueMinutes: 60,
          },
        ],
        summary: { total: 2, critical: 0, acknowledgementBreached: 1, resolutionBreached: 1 },
      },
    });
  });

  it("stops acknowledgement signals after acknowledgement", () => {
    const result = projectCommercialPostActivationAlertSlaSignals({
      items: [{ ...item, lifecycle: "acknowledged" }],
    });
    expect(result).toMatchObject({
      ok: true,
      data: { signals: [{ type: "resolution_breached" }], summary: { total: 1 } },
    });
  });

  it("does not emit active signals for resolved occurrences", () => {
    expect(projectCommercialPostActivationAlertSlaSignals({
      items: [{ ...item, lifecycle: "resolved" }],
    })).toEqual({
      ok: true,
      data: {
        signals: [],
        summary: { total: 0, critical: 0, acknowledgementBreached: 0, resolutionBreached: 0 },
      },
    });
  });

  it("prioritizes critical signals deterministically", () => {
    const result = projectCommercialPostActivationAlertSlaSignals({ items: [
      item,
      {
        ...item,
        alertKey: "onboarding-2:human_escalation:adoption_d3",
        severity: "critical",
        acknowledgementMinutes: 31,
        resolutionMinutes: 241,
        acknowledgementTargetMinutes: 30,
        resolutionTargetMinutes: 240,
      },
    ] });
    expect(result.ok && result.data.signals.map((signal) => signal.severity))
      .toEqual(["critical", "critical", "high", "high"]);
    expect(result).toMatchObject({ ok: true, data: { summary: { total: 4, critical: 2 } } });
  });

  it("returns no signals when every active item is within SLA", () => {
    const result = projectCommercialPostActivationAlertSlaSignals({ items: [{
      ...item,
      acknowledgementBreached: false,
      resolutionBreached: false,
    }] });
    expect(result).toMatchObject({ ok: true, data: { signals: [], summary: { total: 0 } } });
  });

  it("rejects invalid SLA records", () => {
    expect(projectCommercialPostActivationAlertSlaSignals({ items: [{ ...item, resolutionMinutes: -1 }] }))
      .toEqual({
        ok: false,
        error: "invalid_input",
        message: "Dados dos sinais de SLA dos alertas pós-ativação inválidos.",
      });
  });
});
