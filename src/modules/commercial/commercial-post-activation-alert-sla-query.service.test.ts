import { describe, expect, it, vi } from "vitest";

import { listCommercialPostActivationAlertSla } from "./commercial-post-activation-alert-sla-query.service";

const onboardingId = "23164020-8778-4226-afed-189e8d2333cc";
const alertKey = `${onboardingId}:milestone_overdue:adoption_d1`;
const occurrence = {
  alertKey,
  onboardingId,
  severity: "high",
  openedAt: new Date("2026-08-20T12:00:00.000Z"),
  resolvedAt: null,
};
const action = (actionName: "acknowledged" | "resolved", actedAt: string) => ({
  idempotencyKey: `${actionName}-${actedAt}`,
  alertKey,
  action: actionName,
  actor: { type: "human", id: "operator-1" },
  actedAt,
});

function store(overrides: Record<string, unknown> = {}) {
  return {
    listOccurrences: vi.fn().mockResolvedValue([occurrence]),
    listActions: vi.fn().mockResolvedValue([
      action("acknowledged", "2026-08-20T13:00:00.000Z"),
      action("resolved", "2026-08-20T14:00:00.000Z"),
    ]),
    ...overrides,
  };
}

describe("commercial post-activation alert SLA query", () => {
  it("projects durable occurrences with their action history", async () => {
    const storage = store();

    const result = await listCommercialPostActivationAlertSla({
      store: storage,
      now: () => new Date("2026-08-20T15:00:00.000Z"),
    });

    expect(storage.listOccurrences).toHaveBeenCalledWith(1000);
    expect(storage.listActions).toHaveBeenCalledWith([onboardingId]);
    expect(result).toEqual({
      ok: true,
      data: {
        items: [{
          alertKey,
          severity: "high",
          lifecycle: "resolved",
          openedAt: "2026-08-20T12:00:00.000Z",
          acknowledgedAt: "2026-08-20T13:00:00.000Z",
          resolvedAt: "2026-08-20T14:00:00.000Z",
          acknowledgementMinutes: 60,
          resolutionMinutes: 120,
          acknowledgementTargetMinutes: 120,
          resolutionTargetMinutes: 1440,
          acknowledgementBreached: false,
          resolutionBreached: false,
        }],
        summary: {
          total: 1,
          open: 0,
          acknowledged: 0,
          resolved: 1,
          acknowledgementBreached: 0,
          resolutionBreached: 0,
          withinSla: 1,
          complianceRate: 100,
        },
        invalidRecords: 0,
      },
    });
  });

  it("uses the earliest known action for a reconciled historical timeline", async () => {
    const storage = store({
      listOccurrences: vi.fn().mockResolvedValue([{
        ...occurrence,
        openedAt: new Date("2026-08-20T14:00:00.000Z"),
        resolvedAt: new Date("2026-08-20T14:00:00.000Z"),
      }]),
      listActions: vi.fn().mockResolvedValue([
        action("acknowledged", "2026-08-20T13:00:00.000Z"),
        action("resolved", "2026-08-20T14:00:00.000Z"),
      ]),
    });

    const result = await listCommercialPostActivationAlertSla({ store: storage });

    expect(result).toMatchObject({
      ok: true,
      data: {
        items: [{
          openedAt: "2026-08-20T13:00:00.000Z",
          acknowledgedAt: "2026-08-20T13:00:00.000Z",
          resolvedAt: "2026-08-20T14:00:00.000Z",
          acknowledgementMinutes: 0,
          resolutionMinutes: 60,
        }],
        summary: { total: 1, resolved: 1, complianceRate: 100 },
        invalidRecords: 0,
      },
    });
  });

  it("isolates invalid occurrences and action records", async () => {
    const storage = store({
      listOccurrences: vi.fn().mockResolvedValue([
        occurrence,
        { ...occurrence, alertKey: "" },
      ]),
      listActions: vi.fn().mockResolvedValue([
        action("resolved", "2026-08-20T14:00:00.000Z"),
        { invalid: true },
      ]),
    });

    const result = await listCommercialPostActivationAlertSla({ store: storage });

    expect(result).toMatchObject({
      ok: true,
      data: {
        summary: { total: 1, resolved: 1 },
        invalidRecords: 2,
      },
    });
  });

  it("does not query actions when there are no valid occurrences", async () => {
    const storage = store({
      listOccurrences: vi.fn().mockResolvedValue([]),
      listActions: vi.fn().mockResolvedValue([]),
    });

    const result = await listCommercialPostActivationAlertSla({ store: storage });

    expect(storage.listActions).toHaveBeenCalledWith([]);
    expect(result).toMatchObject({
      ok: true,
      data: {
        items: [],
        summary: { total: 0, complianceRate: 100 },
        invalidRecords: 0,
      },
    });
  });

  it("supports explicit SLA targets for operational policy changes", async () => {
    const storage = store({ listActions: vi.fn().mockResolvedValue([]) });

    const result = await listCommercialPostActivationAlertSla({
      store: storage,
      now: () => new Date("2026-08-20T13:00:00.000Z"),
      targets: {
        high: { acknowledgementMinutes: 30, resolutionMinutes: 45 },
      },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        items: [{
          acknowledgementBreached: true,
          resolutionBreached: true,
        }],
        summary: { complianceRate: 0 },
      },
    });
  });

  it("maps inconsistent chronological data to a controlled failure", async () => {
    const storage = store({
      listActions: vi.fn().mockResolvedValue([
        action("acknowledged", "2026-08-20T11:59:00.000Z"),
      ]),
    });

    await expect(listCommercialPostActivationAlertSla({ store: storage }))
      .resolves.toEqual({
        ok: false,
        error: "invalid_sla_data",
        message: "Não foi possível projetar o SLA dos alertas pós-ativação.",
      });
  });

  it("keeps database failures observable", async () => {
    const databaseError = new Error("database unavailable");
    const storage = store({
      listOccurrences: vi.fn().mockRejectedValue(databaseError),
    });

    await expect(listCommercialPostActivationAlertSla({ store: storage }))
      .rejects.toBe(databaseError);
  });
});
