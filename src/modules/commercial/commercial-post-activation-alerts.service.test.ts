import { describe, expect, it } from "vitest";

import { buildCommercialPostActivationAlerts } from "./commercial-post-activation-alerts.service";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const commercialClientId = "0d01a808-24fc-480b-9f60-90e2b9f674fc";

function candidate(
  status: "scheduled" | "waiting" | "overdue" | "escalated" | "completed",
  overrides: Record<string, unknown> = {},
) {
  return {
    onboardingId,
    commercialClientId,
    clientName: "Clínica Exemplo",
    monitoring: {
      planKey: `${onboardingId}:post_activation:2026-08-v1`,
      status,
      currentMilestone: {
        code: "adoption_d1",
        title: "Adoção D+1",
        ownerType: "agent",
        dueAt: "2026-08-15T12:00:00.000Z",
      },
      missingIndicators: [],
      activeEscalations: [],
      supportWindowExpired: false,
      ...overrides,
    },
  };
}

describe("commercial post-activation alerts", () => {
  it("creates a critical alert from active escalation triggers", () => {
    const result = buildCommercialPostActivationAlerts([
      candidate("escalated", { activeEscalations: ["open_critical_incidents"] }),
    ]);

    expect(result).toEqual({
      ok: true,
      data: {
        alerts: [expect.objectContaining({
          key: `${onboardingId}:human_escalation:adoption_d1`,
          severity: "critical",
          category: "human_escalation",
          reasons: ["open_critical_incidents"],
        })],
        summary: { critical: 1, high: 0, total: 1 },
      },
    });
  });

  it("creates a high alert for an overdue milestone", () => {
    const result = buildCommercialPostActivationAlerts([
      candidate("overdue", { missingIndicators: ["first_login", "scheduling_activity"] }),
    ]);

    expect(result.ok && result.data.alerts[0]).toEqual(expect.objectContaining({
      severity: "high",
      category: "milestone_overdue",
      reasons: ["first_login", "scheduling_activity"],
    }));
  });

  it("does not alert healthy monitoring states", () => {
    const result = buildCommercialPostActivationAlerts([
      candidate("scheduled"),
      candidate("waiting"),
      candidate("completed", { currentMilestone: null }),
    ]);

    expect(result).toEqual({
      ok: true,
      data: { alerts: [], summary: { critical: 0, high: 0, total: 0 } },
    });
  });

  it("uses deterministic fallback reasons", () => {
    const result = buildCommercialPostActivationAlerts([
      candidate("escalated"),
      candidate("overdue"),
    ]);

    expect(result.ok && result.data.alerts.map((alert) => alert.reasons)).toEqual([
      ["historical_escalation"],
      ["milestone_due_without_observations"],
    ]);
  });

  it("sorts critical alerts before high alerts and then by due date", () => {
    const secondOnboardingId = "33164020-8778-4226-afed-189e8d2333cc";
    const result = buildCommercialPostActivationAlerts([
      candidate("overdue", {
        currentMilestone: {
          code: "adoption_d3",
          title: "Adoção D+3",
          ownerType: "agent",
          dueAt: "2026-08-14T12:00:00.000Z",
        },
      }),
      { ...candidate("escalated"), onboardingId: secondOnboardingId },
    ]);

    expect(result.ok && result.data.alerts.map((alert) => alert.severity)).toEqual([
      "critical",
      "high",
    ]);
  });

  it("rejects malformed candidates", () => {
    expect(buildCommercialPostActivationAlerts([{ onboardingId: "invalid" }])).toEqual({
      ok: false,
      error: "invalid_input",
      message: "Dados de alertas pós-ativação inválidos.",
    });
  });
});
