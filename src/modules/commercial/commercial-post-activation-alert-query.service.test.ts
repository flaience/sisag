import { describe, expect, it, vi } from "vitest";

import { listCommercialPostActivationAlerts } from "./commercial-post-activation-alert-query.service";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const commercialClientId = "0d01a808-24fc-480b-9f60-90e2b9f674fc";

function monitoringItem(
  status: "overdue" | "escalated",
  overrides: Record<string, unknown> = {},
) {
  return {
    onboardingId,
    commercialClientId,
    clientName: "Clínica Exemplo",
    clientStatus: "active" as const,
    monitoring: {
      onboardingId,
      planKey: `${onboardingId}:post_activation:2026-08-v1`,
      status,
      currentMilestone: {
        code: "adoption_d1",
        title: "Adoção D+1",
        ownerType: "agent" as const,
        dueAt: "2026-08-15T12:00:00.000Z",
      },
      processedMilestones: 1,
      completedMilestones: 1,
      escalatedMilestones: status === "escalated" ? 1 : 0,
      totalMilestones: 5,
      missingIndicators: status === "overdue" ? ["first_login"] : [],
      activeEscalations: status === "escalated" ? ["open_critical_incidents"] : [],
      lastProcessedAt: "2026-08-14T12:00:00.000Z",
      supportWindowEndsAt: "2026-08-28T12:00:00.000Z",
      supportWindowExpired: false,
      ...overrides,
    },
  };
}

function successfulMonitoring(items = [
  monitoringItem("escalated"),
  monitoringItem("overdue", {
    currentMilestone: {
      code: "adoption_d3",
      title: "Adoção D+3",
      ownerType: "agent" as const,
      dueAt: "2026-08-17T12:00:00.000Z",
    },
  }),
]) {
  return {
    ok: true as const,
    data: {
      items,
      summary: { scheduled: 0, waiting: 0, overdue: 1, escalated: 1, completed: 0 },
      invalidRecords: 2,
      failures: [],
    },
  };
}

describe("commercial post-activation alert query", () => {
  it("lists prioritized alerts and preserves invalid record count", async () => {
    const listMonitoring = vi.fn(async () => successfulMonitoring());

    const result = await listCommercialPostActivationAlerts({}, { listMonitoring });

    expect(listMonitoring).toHaveBeenCalledWith({ limit: 100 });
    expect(result.ok && result.data.alerts.map((alert) => alert.severity)).toEqual([
      "critical",
      "high",
    ]);
    expect(result.ok && result.data).toEqual(expect.objectContaining({
      summary: { critical: 1, high: 1, total: 2 },
      invalidRecords: 2,
    }));
  });

  it("filters by severity and category", async () => {
    const result = await listCommercialPostActivationAlerts(
      { severity: "high", category: "milestone_overdue" },
      { listMonitoring: async () => successfulMonitoring() },
    );

    expect(result.ok && result.data.alerts).toHaveLength(1);
    expect(result.ok && result.data.alerts[0]).toEqual(expect.objectContaining({
      severity: "high",
      category: "milestone_overdue",
    }));
  });

  it("applies the requested limit and recalculates the summary", async () => {
    const result = await listCommercialPostActivationAlerts(
      { limit: 1 },
      { listMonitoring: async () => successfulMonitoring() },
    );

    expect(result.ok && result.data.summary).toEqual({ critical: 1, high: 0, total: 1 });
  });

  it("rejects invalid filters before querying monitoring", async () => {
    const listMonitoring = vi.fn(async () => successfulMonitoring());

    const result = await listCommercialPostActivationAlerts(
      { limit: 0 },
      { listMonitoring },
    );

    expect(result).toEqual(expect.objectContaining({ ok: false, error: "invalid_input" }));
    expect(listMonitoring).not.toHaveBeenCalled();
  });

  it("normalizes monitoring query failures", async () => {
    const result = await listCommercialPostActivationAlerts({}, {
      listMonitoring: async () => ({
        ok: false,
        error: "invalid_input",
        message: "private monitoring detail",
      }),
    });

    expect(result).toEqual({
      ok: false,
      error: "monitoring_unavailable",
      message: "Não foi possível consultar o monitoramento pós-ativação.",
    });
  });
});
