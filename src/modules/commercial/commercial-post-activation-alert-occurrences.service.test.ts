import { describe, expect, it, vi } from "vitest";

import { synchronizeCommercialPostActivationAlertOccurrences } from "./commercial-post-activation-alert-occurrences.service";

const alert = {
  key: "23164020-8778-4226-afed-189e8d2333cc:milestone_overdue:adoption_d1",
  severity: "high",
  category: "milestone_overdue",
  onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
  commercialClientId: "0d01a808-24fc-480b-9f60-90e2b9f674fc",
};
const resolvedAction = {
  idempotencyKey: "resolve-request-1",
  alertKey: alert.key,
  action: "resolved",
  actor: { type: "human", id: "operator-1" },
  actedAt: "2026-08-20T13:00:00.000Z",
  onboardingId: alert.onboardingId,
  commercialClientId: alert.commercialClientId,
};

function store(overrides: Record<string, unknown> = {}) {
  const tx = {
    upsertActive: vi.fn().mockResolvedValue(undefined),
    resolve: vi.fn().mockResolvedValue("resolved"),
    backfillResolved: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
  return {
    tx,
    transaction: vi.fn(async (callback) => callback(tx)),
  };
}

describe("commercial post-activation alert occurrences", () => {
  it("upserts active alerts with one observation timestamp", async () => {
    const storage = store();

    const result = await synchronizeCommercialPostActivationAlertOccurrences({
      alerts: [alert],
      actions: [],
    }, {
      store: storage,
      now: () => new Date("2026-08-20T12:00:00.000Z"),
    });

    expect(result).toEqual({
      ok: true,
      observed: 1,
      resolved: 0,
      replayedResolutions: 0,
      reconciledResolutions: 0,
      missingOccurrences: 0,
    });
    expect(storage.tx.upsertActive).toHaveBeenCalledWith({
      ...alert,
      observedAt: new Date("2026-08-20T12:00:00.000Z"),
    });
  });

  it("resolves known occurrences from the action history", async () => {
    const storage = store();

    const result = await synchronizeCommercialPostActivationAlertOccurrences({
      alerts: [],
      actions: [resolvedAction],
    }, { store: storage });

    expect(result).toMatchObject({
      ok: true,
      observed: 0,
      resolved: 1,
      replayedResolutions: 0,
      reconciledResolutions: 0,
      missingOccurrences: 0,
    });
    expect(storage.tx.resolve).toHaveBeenCalledWith(
      alert.key,
      new Date("2026-08-20T13:00:00.000Z"),
    );
  });

  it("reconciles pre-registry resolutions without inventing an earlier opening time", async () => {
    const storage = store({
      resolve: vi.fn()
        .mockResolvedValueOnce("replayed")
        .mockResolvedValueOnce("missing"),
    });
    const secondAction = {
      ...resolvedAction,
      idempotencyKey: "resolve-request-2",
      alertKey: `${alert.onboardingId}:human_escalation:adoption_d1`,
    };

    const result = await synchronizeCommercialPostActivationAlertOccurrences({
      alerts: [],
      actions: [resolvedAction, secondAction],
    }, { store: storage });

    expect(result).toMatchObject({
      ok: true,
      resolved: 0,
      replayedResolutions: 1,
      reconciledResolutions: 1,
      missingOccurrences: 0,
    });
    expect(storage.tx.backfillResolved).toHaveBeenCalledWith({
      alertKey: secondAction.alertKey,
      onboardingId: alert.onboardingId,
      commercialClientId: alert.commercialClientId,
      severity: "critical",
      category: "human_escalation",
      resolvedAt: new Date(secondAction.actedAt),
    });
  });

  it("keeps unrecognized historical keys visible as missing", async () => {
    const storage = store({ resolve: vi.fn().mockResolvedValue("missing") });

    const result = await synchronizeCommercialPostActivationAlertOccurrences({
      alerts: [],
      actions: [{ ...resolvedAction, alertKey: "legacy-alert" }],
    }, { store: storage });

    expect(result).toMatchObject({
      ok: true,
      reconciledResolutions: 0,
      missingOccurrences: 1,
    });
    expect(storage.tx.backfillResolved).not.toHaveBeenCalled();
  });

  it("treats a concurrent reconciliation as an idempotent replay", async () => {
    const storage = store({
      resolve: vi.fn().mockResolvedValue("missing"),
      backfillResolved: vi.fn().mockResolvedValue(false),
    });

    const result = await synchronizeCommercialPostActivationAlertOccurrences({
      alerts: [],
      actions: [resolvedAction],
    }, { store: storage });

    expect(result).toMatchObject({
      ok: true,
      reconciledResolutions: 0,
      replayedResolutions: 1,
      missingOccurrences: 0,
    });
  });

  it("ignores acknowledgement actions during occurrence synchronization", async () => {
    const storage = store();

    await synchronizeCommercialPostActivationAlertOccurrences({
      alerts: [],
      actions: [{ ...resolvedAction, action: "acknowledged" }],
    }, { store: storage });

    expect(storage.tx.resolve).not.toHaveBeenCalled();
  });

  it("rejects malformed data before opening a transaction", async () => {
    const storage = store();

    const result = await synchronizeCommercialPostActivationAlertOccurrences({
      alerts: [{ ...alert, severity: "unknown" }],
      actions: [],
    }, { store: storage });

    expect(result).toEqual({
      ok: false,
      error: "invalid_input",
      message: "Dados das ocorrências de alertas pós-ativação inválidos.",
    });
    expect(storage.transaction).not.toHaveBeenCalled();
  });

  it("propagates storage failures for server-side observability", async () => {
    const databaseError = new Error("database unavailable");
    const storage = {
      transaction: vi.fn().mockRejectedValue(databaseError),
    };

    await expect(synchronizeCommercialPostActivationAlertOccurrences({
      alerts: [alert],
      actions: [],
    }, { store: storage })).rejects.toBe(databaseError);
  });
});
