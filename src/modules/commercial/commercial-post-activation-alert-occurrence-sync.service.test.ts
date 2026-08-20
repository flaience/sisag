import { describe, expect, it, vi } from "vitest";

import { synchronizeCommercialPostActivationAlertOccurrenceRegistry } from "./commercial-post-activation-alert-occurrence-sync.service";

const activeAlert = {
  key: "23164020-8778-4226-afed-189e8d2333cc:milestone_overdue:adoption_d1",
  severity: "high",
  category: "milestone_overdue",
  onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
  commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
  clientName: "Clínica Exemplo",
  planKey: "plan-1",
  milestoneCode: "adoption_d1",
  milestoneTitle: "Adoção D+1",
  ownerType: "agent",
  dueAt: "2026-08-20T12:00:00.000Z",
  reasons: ["first_login"],
  supportWindowExpired: false,
  lifecycle: "new",
  acknowledgedAt: null,
  acknowledgedBy: null,
};
const resolvedAction = {
  idempotencyKey: "resolve-request-1",
  alertKey: activeAlert.key,
  action: "resolved",
  actor: { type: "human", id: "operator-1" },
  actedAt: "2026-08-20T13:00:00.000Z",
  onboardingId: activeAlert.onboardingId,
  commercialClientId: activeAlert.commercialClientId,
  clientName: "Clínica Exemplo",
};

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    listAlerts: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        alerts: [activeAlert],
        summary: { critical: 0, high: 1, new: 1, acknowledged: 0, resolved: 0, total: 1 },
        invalidRecords: 0,
      },
    }),
    listHistory: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        items: [resolvedAction],
        summary: { acknowledged: 0, resolved: 1, total: 1 },
        invalidRecords: 0,
        nextCursor: null,
      },
    }),
    synchronize: vi.fn().mockResolvedValue({
      ok: true,
      observed: 1,
      resolved: 1,
      replayedResolutions: 0,
      missingOccurrences: 0,
    }),
    ...overrides,
  };
}

describe("commercial post-activation alert occurrence registry sync", () => {
  it("collects active alerts and resolved actions for durable synchronization", async () => {
    const deps = dependencies();
    const now = () => new Date("2026-08-20T14:00:00.000Z");

    const result = await synchronizeCommercialPostActivationAlertOccurrenceRegistry({
      ...deps,
      now,
    });

    expect(deps.listAlerts).toHaveBeenCalledWith({ limit: 100 });
    expect(deps.listHistory).toHaveBeenCalledWith({ action: "resolved", limit: 100 });
    expect(deps.synchronize).toHaveBeenCalledWith({
      alerts: [{
        key: activeAlert.key,
        severity: "high",
        category: "milestone_overdue",
        onboardingId: activeAlert.onboardingId,
        commercialClientId: activeAlert.commercialClientId,
      }],
      actions: [resolvedAction],
    }, { now });
    expect(result).toEqual({
      ok: true,
      activeAlerts: 1,
      resolvedActions: 1,
      observed: 1,
      resolved: 1,
      replayedResolutions: 0,
      missingOccurrences: 0,
      invalidRecords: 0,
      historyTruncated: false,
    });
  });

  it("reports truncated history and isolated invalid records", async () => {
    const deps = dependencies({
      listAlerts: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          alerts: [],
          summary: { critical: 0, high: 0, new: 0, acknowledged: 0, resolved: 0, total: 0 },
          invalidRecords: 2,
        },
      }),
      listHistory: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          items: [],
          summary: { acknowledged: 0, resolved: 0, total: 0 },
          invalidRecords: 1,
          nextCursor: "next-page",
        },
      }),
      synchronize: vi.fn().mockResolvedValue({
        ok: true,
        observed: 0,
        resolved: 0,
        replayedResolutions: 0,
        missingOccurrences: 0,
      }),
    });

    const result = await synchronizeCommercialPostActivationAlertOccurrenceRegistry(deps);

    expect(result).toMatchObject({
      ok: true,
      invalidRecords: 3,
      historyTruncated: true,
    });
  });

  it("stops when active alerts are unavailable", async () => {
    const deps = dependencies({
      listAlerts: vi.fn().mockResolvedValue({
        ok: false,
        error: "monitoring_unavailable",
        message: "private monitoring detail",
      }),
    });

    const result = await synchronizeCommercialPostActivationAlertOccurrenceRegistry(deps);

    expect(result).toEqual({
      ok: false,
      error: "alert_query_failed",
      message: "Não foi possível coletar os alertas pós-ativação.",
    });
    expect(deps.listHistory).not.toHaveBeenCalled();
    expect(deps.synchronize).not.toHaveBeenCalled();
  });

  it("stops when resolved action history is unavailable", async () => {
    const deps = dependencies({
      listHistory: vi.fn().mockResolvedValue({
        ok: false,
        error: "invalid_input",
        message: "private history detail",
      }),
    });

    const result = await synchronizeCommercialPostActivationAlertOccurrenceRegistry(deps);

    expect(result).toEqual({
      ok: false,
      error: "history_query_failed",
      message: "Não foi possível coletar as resoluções dos alertas pós-ativação.",
    });
    expect(deps.synchronize).not.toHaveBeenCalled();
  });

  it("maps controlled persistence validation failures", async () => {
    const deps = dependencies({
      synchronize: vi.fn().mockResolvedValue({
        ok: false,
        error: "invalid_input",
        message: "private persistence detail",
      }),
    });

    await expect(synchronizeCommercialPostActivationAlertOccurrenceRegistry(deps))
      .resolves.toEqual({
        ok: false,
        error: "synchronization_failed",
        message: "Não foi possível sincronizar as ocorrências dos alertas pós-ativação.",
      });
  });

  it("keeps unexpected dependency failures observable", async () => {
    const databaseError = new Error("database unavailable");
    const deps = dependencies({
      listAlerts: vi.fn().mockRejectedValue(databaseError),
    });

    await expect(synchronizeCommercialPostActivationAlertOccurrenceRegistry(deps))
      .rejects.toBe(databaseError);
  });
});
